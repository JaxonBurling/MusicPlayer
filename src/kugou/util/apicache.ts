/**
 * @fileoverview API 响应缓存中间件
 *
 * 来源: 基于 [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) 修改
 *
 * 本模块提供 Express 中间件级别的 API 响应缓存功能，支持：
 * - 内存缓存（默认）和 Redis 缓存（可选）
 * - 按时间字符串（如 "2 minutes"、"1 hour"）设置缓存过期
 * - 按分组管理缓存条目，支持批量清除
 * - 自定义缓存条件（状态码过滤、请求/响应 toggle 函数）
 * - 缓存命中率统计（可选，用于性能监控）
 * - ETag/304 协商缓存支持
 * - JSONP 请求的 URL 去参处理
 *
 * 使用示例：
 *   const cache = require('./apicache').middleware;
 *   app.use(cache('2 minutes', (req, res) => res.statusCode === 200));
 *
 * @module apicache
 * @requires ./memory-cache - 内存缓存实现
 */

import MemoryCache from './memory-cache';

/** 时间单位到毫秒的转换表 */
const t: Record<string, number> = {
  ms: 1,                    // 毫秒
  second: 1000,             // 秒 → 1000ms
  minute: 60000,            // 分钟 → 60000ms
  hour: 3600000,            // 小时 → 3600000ms
  day: 3600000 * 24,        // 天 → 86400000ms
  week: 3600000 * 24 * 7,   // 周 → 604800000ms
  month: 3600000 * 24 * 30, // 月（30天）→ 2592000000ms
};

/** 缓存索引 */
interface CacheIndex {
  all: string[];
  groups: Record<string, string[]>;
}

/** 全局配置选项 */
interface GlobalOptions {
  debug: boolean;
  defaultDuration: number;
  enabled: boolean;
  appendKey: any[];
  jsonp: boolean;
  redisClient: any;
  headerBlacklist: string[];
  statusCodes: { include: number[]; exclude: number[] };
  events: { expire?: (...args: any[]) => void };
  headers: Record<string, string>;
  trackPerformance: boolean;
  [key: string]: any;
}

/** 中间件注册项 */
interface MiddlewareOption {
  options: Record<string, any>;
  localOptions?: Record<string, any>;
}

/** 缓存对象 */
interface CacheObject {
  status: number;
  headers: Record<string, any>;
  data: any;
  encoding: string;
  timestamp: number;
}

/**
 * 所有 ApiCache 实例的全局注册表
 */
const instances: ApiCache[] = [];

/** 创建严格相等匹配函数 */
const matches = function (a: string) {
  return function (b: string) {
    return a === b;
  };
};

/** 创建不匹配函数（matches 的反函数） */
const doesntMatch = function (a: string) {
  return function (b: string) {
    return !matches(a)(b);
  };
};

/**
 * 格式化持续时间为人类可读的日志字符串
 * @param d 持续时间（毫秒）
 * @param prefix 可选的前缀文本
 * @returns 带颜色的日志字符串
 */
const logDuration = function (d: number, prefix?: string): string {
  const str = d > 1000 ? `${(d / 1000).toFixed(2)}sec` : `${d}ms`;
  return `\x1B[33m- ${prefix ? `${prefix} ` : ''}${str}\x1B[0m`;
};

/** 安全地获取响应头对象 */
function getSafeHeaders(res: any): Record<string, any> {
  return res.getHeaders ? res.getHeaders() : res._headers;
}

/** 空操作的性能统计类（不跟踪性能时使用） */
class NOOPCachePerformance {
  report(): undefined {
    return undefined;
  }
  hit(_key: string): void {
    // noop
  }
  miss(_key: string): void {
    // noop
  }
}

/**
 * 缓存命中率统计类
 *
 * 使用位压缩技术高效存储历史命中/未命中记录：
 * - 每个 Uint8Array 元素存储 4 条记录
 * - 每条记录占 2 bit: 00=无记录, 01=命中, 10=未命中
 */
class CachePerformance {
  hitsLast100 = new Uint8Array(100 / 4);       // each hit is 2 bits
  hitsLast1000 = new Uint8Array(1000 / 4);
  hitsLast10000 = new Uint8Array(10000 / 4);
  hitsLast100000 = new Uint8Array(100000 / 4);
  callCount = 0;
  hitCount = 0;
  lastCacheHit: string | null = null;
  lastCacheMiss: string | null = null;

  /** 生成性能统计报告 */
  report(): Record<string, any> {
    return {
      lastCacheHit: this.lastCacheHit,
      lastCacheMiss: this.lastCacheMiss,
      callCount: this.callCount,
      hitCount: this.hitCount,
      missCount: this.callCount - this.hitCount,
      hitRate: this.callCount == 0 ? null : this.hitCount / this.callCount,
      hitRateLast100: this.hitRate(this.hitsLast100),
      hitRateLast1000: this.hitRate(this.hitsLast1000),
      hitRateLast10000: this.hitRate(this.hitsLast10000),
      hitRateLast100000: this.hitRate(this.hitsLast100000),
    };
  }

  /** 从位压缩数组中计算命中率 */
  hitRate(array: Uint8Array): number | null {
    let hits = 0;
    let misses = 0;
    for (let i = 0; i < array.length; i++) {
      let n8 = array[i];
      for (let j = 0; j < 4; j++) {
        switch (n8 & 3) {
          case 1:
            hits++;
            break;
          case 2:
            misses++;
            break;
        }
        n8 >>= 2;
      }
    }
    const total = hits + misses;
    if (total == 0) {
      return null;
    }
    return hits / total;
  }

  /** 在位压缩数组中记录一次命中或未命中 */
  recordHitInArray(array: Uint8Array, hit: boolean): void {
    const arrayIndex = ~~(this.callCount / 4) % array.length;   // 数组索引
    const bitOffset = (this.callCount % 4) * 2;                  // 位偏移（每 2 bit 一条记录）
    const clearMask = ~(3 << bitOffset);                         // 清除掩码
    const record = (hit ? 1 : 2) << bitOffset;                   // 编码记录
    array[arrayIndex] = (array[arrayIndex] & clearMask) | record;
  }

  /** 记录一次命中/未命中到所有时间窗口的数组 */
  recordHit(hit: boolean): void {
    this.recordHitInArray(this.hitsLast100, hit);
    this.recordHitInArray(this.hitsLast1000, hit);
    this.recordHitInArray(this.hitsLast10000, hit);
    this.recordHitInArray(this.hitsLast100000, hit);
    if (hit) {
      this.hitCount++;
    }
    this.callCount++;
  }

  /** 记录一次缓存命中 */
  hit(key: string): void {
    this.recordHit(true);
    this.lastCacheHit = key;
  }

  /** 记录一次缓存未命中 */
  miss(key: string): void {
    this.recordHit(false);
    this.lastCacheMiss = key;
  }
}

/**
 * ApiCache 缓存中间件
 *
 * 每个实例维护独立的：内存缓存、全局配置、缓存索引、定时器集合与性能统计。
 */
class ApiCache {
  id: number;
  private memCache = new MemoryCache<CacheObject>();
  private globalOptions: GlobalOptions = {
    debug: false,                // 是否开启调试日志
    defaultDuration: 3600000,    // 默认缓存时长（1小时，毫秒）
    enabled: true,               // 是否启用缓存
    appendKey: [],               // 自定义缓存键追加字段（数组或函数）
    jsonp: false,                // 是否为 JSONP 请求
    redisClient: false,          // Redis 客户端实例（false 表示使用内存缓存）
    headerBlacklist: [],         // 不缓存的响应头黑名单
    statusCodes: {
      include: [],               // 仅缓存这些状态码（空数组表示不限制）
      exclude: [],               // 排除这些状态码
    },
    events: {
      expire: undefined,         // 缓存过期时的回调函数
    },
    headers: {},                 // 强制覆盖的响应头
    trackPerformance: false,     // 是否跟踪缓存命中率
  };

  private middlewareOptions: MiddlewareOption[] = [];
  private index: CacheIndex = { all: [], groups: {} };
  private timers: Record<string, ReturnType<typeof setTimeout>> = {};
  private performanceArray: (CachePerformance | NOOPCachePerformance)[] = [];

  constructor() {
    // 将当前实例注册到全局实例列表
    instances.push(this);
    this.id = instances.length;

    // 初始化缓存索引
    this.resetIndex();
  }

  /** 调试日志输出函数 */
  private debug(a?: any, b?: any, c?: any, d?: any): void {
    const arr = ['\x1B[36m[apicache]\x1B[0m', a, b, c, d].filter((arg) => {
      return arg !== undefined;
    });
    const debugEnv = process.env.DEBUG && process.env.DEBUG.split(',').includes('apicache');

    if (this.globalOptions.debug || debugEnv) console.log.apply(null, arr as any);
  }

  /** 判断响应是否应该被缓存 */
  private shouldCacheResponse(request: any, response: any, toggle?: (req: any, res: any) => boolean): boolean {
    const opt = this.globalOptions;
    const codes = opt.statusCodes;

    if (!response) {
      return false;
    }

    // 自定义 toggle 函数判断
    if (toggle && !toggle(request, response)) {
      return false;
    }

    // 状态码排除列表
    if (codes.exclude && codes.exclude.length && codes.exclude.includes(response.statusCode)) {
      return false;
    }
    // 状态码包含列表（白名单模式）
    if (codes.include && codes.include.length && codes.include.includes(response.statusCode)) {
      return false;
    }

    return true;
  }

  /** 将缓存键添加到索引中 */
  private addIndexEntries(key: string, req: any): void {
    const groupName = req.apicacheGroup;

    if (groupName) {
      this.debug(`group detected "${groupName}"`);
      // 将键添加到分组索引（unshift 添加到数组头部）
      const group = (this.index.groups[groupName] = this.index.groups[groupName] || []);
      group.unshift(key);
    }

    // 将键添加到全局索引
    this.index.all.unshift(key);
  }

  /** 过滤掉黑名单中的响应头 */
  private filterBlacklistedHeaders(headers: Record<string, any>): Record<string, any> {
    return Object.keys(headers)
      .filter((key) => {
        return !this.globalOptions.headerBlacklist.includes(key);
      })
      .reduce<Record<string, any>>((acc, header) => {
        acc[header] = headers[header];
        return acc;
      }, {});
  }

  /** 创建缓存对象 */
  private createCacheObject(status: number, headers: Record<string, any>, data: any, encoding: string): CacheObject {
    return {
      status,
      headers: this.filterBlacklistedHeaders(headers), // 过滤黑名单头
      data,
      encoding,
      timestamp: new Date().getTime() / 1000, // Unix 时间戳（秒）
    };
  }

  /** 将响应数据存入缓存 */
  private cacheResponse(key: string, value: CacheObject, duration: number): void {
    const redis = this.globalOptions.redisClient;
    const expireCallback = this.globalOptions.events.expire;

    if (redis && redis.connected) {
      // Redis 存储
      try {
        redis.hset(key, 'response', JSON.stringify(value));
        redis.hset(key, 'duration', duration);
        redis.expire(key, duration / 1000, expireCallback || (() => {}));
      } catch {
        this.debug('[apicache] error in redis.hset()');
      }
    } else {
      // 内存存储
      this.memCache.add(key, value, duration, expireCallback);
    }

    // 设置自动清除定时器（限制最大值防止 setTimeout 溢出）
    this.timers[key] = setTimeout(() => {
      this.clear(key, true);
    }, Math.min(duration, 2147483647));
  }

  /** 累积响应内容到 res._apicache.content */
  private accumulateContent(res: any, content: any): void {
    if (content) {
      if (typeof content == 'string') {
        // 字符串拼接
        res._apicache.content = (res._apicache.content || '') + content;
      } else if (Buffer.isBuffer(content)) {
        let oldContent = res._apicache.content;

        // 将旧的字符串内容转为 Buffer
        if (typeof oldContent === 'string') {
          oldContent = Buffer.from(oldContent);
        }

        if (!oldContent) {
          oldContent = Buffer.alloc(0);
        }

        // Buffer 拼接
        res._apicache.content = Buffer.concat([oldContent, content], oldContent.length + content.length);
      } else {
        // 其他类型直接赋值
        res._apicache.content = content;
      }
    }
  }

  /** 使响应变得可缓存（Monkey-patch res 的方法） */
  private makeResponseCacheable(
    req: any,
    res: any,
    next: (...args: any[]) => void,
    key: string,
    duration: number,
    strDuration: string,
    toggle?: (req: any, res: any) => boolean,
  ): void {
    // 保存原始方法引用，用于后续调用
    res._apicache = {
      write: res.write,
      writeHead: res.writeHead,
      end: res.end,
      cacheable: true,
      content: undefined,
    };

    // 应用全局响应头覆盖
    Object.keys(this.globalOptions.headers).forEach((name) => {
      res.setHeader(name, this.globalOptions.headers[name]);
    });

    // 重写 res.writeHead：添加 cache-control 头并保存响应头快照
    res.writeHead = (...args: any[]) => {
      if (!this.globalOptions.headers['cache-control']) {
        if (this.shouldCacheResponse(req, res, toggle)) {
          // 可缓存：设置 max-age
          res.setHeader('cache-control', `max-age=${(duration / 1000).toFixed(0)}`);
        } else {
          // 不可缓存：禁止缓存
          res.setHeader('cache-control', 'no-cache, no-store, must-revalidate');
        }
      }

      // 保存响应头快照（在 writeHead 被调用后，headers 已确定）
      res._apicache.headers = Object.assign({}, getSafeHeaders(res));
      return res._apicache.writeHead.apply(res, args);
    };

    // 重写 res.write：累积部分内容
    res.write = (...args: any[]) => {
      this.accumulateContent(res, args[0]);
      return res._apicache.write.apply(res, args);
    };

    // 重写 res.end：判断是否缓存，创建缓存对象并存储
    res.end = (...args: any[]) => {
      if (this.shouldCacheResponse(req, res, toggle)) {
        this.accumulateContent(res, args[0]);

        if (res._apicache.cacheable && res._apicache.content) {
          // 添加到缓存索引
          this.addIndexEntries(key, req);
          const headers = res._apicache.headers || getSafeHeaders(res);
          // 创建缓存对象并存储
          const cacheObject = this.createCacheObject(res.statusCode, headers, res._apicache.content, args[1]);
          this.cacheResponse(key, cacheObject, duration);

          // 调试日志
          const elapsed = (new Date() as any) - req.apicacheTimer;
          this.debug(`adding cache entry for "${key}" @ ${strDuration}`, logDuration(elapsed));
          this.debug('_apicache.headers: ', res._apicache.headers);
          this.debug('res.getHeaders(): ', getSafeHeaders(res));
          this.debug('cacheObject: ', cacheObject);
        }
      }

      // 调用原始 res.end
      return res._apicache.end.apply(res, args);
    };

    next();
  }

  /** 发送缓存的响应 */
  private sendCachedResponse(
    request: any,
    response: any,
    cacheObject: CacheObject,
    toggle: ((req: any, res: any) => boolean) | undefined,
    next: (...args: any[]) => void,
    duration: number,
  ): void {
    if (toggle && !toggle(request, response)) {
      return next();
    }

    const headers = getSafeHeaders(response);

    // 合并缓存的响应头，并正确递减 max-age
    Object.assign(headers, this.filterBlacklistedHeaders(cacheObject.headers || {}), {
      // max-age = 原始时长 - 已过去的时间，最小为 0
      'cache-control': `max-age=${Math.max(0, Number((duration / 1000 - (new Date().getTime() / 1000 - cacheObject.timestamp)).toFixed(0)))}`,
    });

    // 反序列化 Buffer 数据
    let data = cacheObject.data;
    if (data && data.type === 'Buffer') {
      data = typeof data.data === 'number' ? Buffer.alloc(data.data) : Buffer.from(data.data);
    }

    // ETag 协商缓存：如果请求的 If-None-Match 与缓存的 ETag 匹配，返回 304
    const cachedEtag = cacheObject.headers.etag;
    const requestEtag = request.headers['if-none-match'];

    if (requestEtag && cachedEtag === requestEtag) {
      response.writeHead(304, headers);
      return response.end();
    }

    // 返回缓存的响应
    response.writeHead(cacheObject.status || 200, headers);

    return response.end(data, cacheObject.encoding);
  }

  /** 同步全局选项到所有中间件实例 */
  private syncOptions(): void {
    for (const i in this.middlewareOptions) {
      Object.assign(this.middlewareOptions[i].options, this.globalOptions, this.middlewareOptions[i].localOptions);
    }
  }

  /**
   * 清除缓存
   *
   * @param target 分组名或缓存键，为空则清除全部
   * @param isAutomatic 是否为自动过期清除（用于日志区分）
   * @returns 当前缓存索引
   */
  clear(target?: string, isAutomatic?: boolean): CacheIndex {
    const group = target ? this.index.groups[target] : undefined;
    const redis = this.globalOptions.redisClient;

    if (group) {
      // 模式1: 按分组名清除
      this.debug(`clearing group "${target}"`);

      group.forEach((key) => {
        this.debug(`clearing cached entry for "${key}"`);
        clearTimeout(this.timers[key]);
        delete this.timers[key];
        if (!this.globalOptions.redisClient) {
          this.memCache.delete(key);
        } else {
          try {
            redis.del(key);
          } catch {
            console.log(`[apicache] error in redis.del("${key}")`);
          }
        }
        this.index.all = this.index.all.filter(doesntMatch(key));
      });

      delete this.index.groups[target!];
    } else if (target) {
      // 模式2: 按缓存键清除
      this.debug(`clearing ${isAutomatic ? 'expired' : 'cached'} entry for "${target}"`);
      clearTimeout(this.timers[target]);
      delete this.timers[target];

      if (!redis) {
        this.memCache.delete(target);
      } else {
        try {
          redis.del(target);
        } catch {
          console.log(`[apicache] error in redis.del("${target}")`);
        }
      }

      // 从全局索引中移除
      this.index.all = this.index.all.filter(doesntMatch(target));

      // 从所有分组中移除，并清理空分组
      Object.keys(this.index.groups).forEach((groupName) => {
        this.index.groups[groupName] = this.index.groups[groupName].filter(doesntMatch(target));

        if (!this.index.groups[groupName].length) {
          delete this.index.groups[groupName];
        }
      });
    } else {
      // 模式3: 全部清除
      this.debug('clearing entire index');

      if (!redis) {
        this.memCache.clear();
      } else {
        // 逐个清除 Redis 键（避免误删非 apicache 的条目）
        this.index.all.forEach((key) => {
          clearTimeout(this.timers[key]);
          delete this.timers[key];
          try {
            redis.del(key);
          } catch {
            console.log(`[apicache] error in redis.del("${key}")`);
          }
        });
      }
      this.resetIndex();
    }

    return this.getIndex() as CacheIndex;
  }

  /** 解析时长字符串为毫秒数 */
  private parseDuration(duration: number | string, defaultDuration: number): number {
    if (typeof duration === 'number') {
      return duration;
    }

    if (typeof duration === 'string') {
      const split = duration.match(/^([\d\.,]+)\s?(\w+)$/);

      if (split && split.length === 3) {
        const len = Number.parseFloat(split[1]);
        let unit = split[2].replace(/s$/i, '').toLowerCase();
        if (unit === 'm') {
          unit = 'ms';
        }

        return (len || 1) * (t[unit] || 0);
      }
    }

    return defaultDuration;
  }

  /** 获取时长（公开方法） */
  getDuration(duration: number | string): number {
    return this.parseDuration(duration, this.globalOptions.defaultDuration);
  }

  /** 获取缓存性能统计（命中率） */
  getPerformance(): any[] {
    return this.performanceArray.map((p) => {
      return p.report();
    });
  }

  /** 获取缓存索引 */
  getIndex(group?: string): CacheIndex | string[] {
    if (group) {
      return this.index.groups[group];
    } else {
      return this.index;
    }
  }

  /**
   * 创建缓存中间件
   *
   * @param strDuration 缓存时长（如 "2 minutes" 或 120000）
   * @param middlewareToggle 中间件级别的缓存条件函数 (req, res) => boolean
   * @param localOptions 本中间件的局部配置（覆盖全局配置）
   * @returns Express 中间件函数
   */
  middleware(
    strDuration: number | string,
    middlewareToggle?: (req: any, res: any) => boolean,
    localOptions?: Record<string, any>,
  ): any {
    const duration = this.getDuration(strDuration);
    const opt: Record<string, any> = {};

    // 注册中间件选项
    this.middlewareOptions.push({
      options: opt,
    });

    /** 更新或获取中间件选项 */
    const options = (localOptions?: Record<string, any>): Record<string, any> => {
      if (localOptions) {
        this.middlewareOptions.find((middleware) => {
          return middleware.options === opt;
        })!.localOptions = localOptions;
      }

      this.syncOptions();

      return opt;
    };

    options(localOptions);

    // 根据配置决定使用真实的性能统计还是空操作
    const perf = this.globalOptions.trackPerformance ? new CachePerformance() : new NOOPCachePerformance();

    this.performanceArray.push(perf);

    /** 核心缓存中间件函数 */
    const cache = (req: any, res: any, next: (...args: any[]) => void) => {
      /** 跳过缓存，直接进入下一个中间件 */
      function bypass() {
        return next();
      }

      // 初始跳过检查
      if (!opt.enabled) {
        return bypass();
      }
      // 通过请求头强制跳过缓存
      if (req.headers['x-apicache-bypass'] || req.headers['x-apicache-force-fetch']) {
        return bypass();
      }

      // 记录请求开始时间（用于计算耗时）
      req.apicacheTimer = new Date();

      // 生成缓存键: hostname + URL
      let key = req.hostname + (req.originalUrl || req.url);
      // JSONP 模式：去除查询参数（避免不同的 callback 参数产生不同的缓存键）
      if (opt.jsonp) {
        key = key.split('?')[0];
      }

      // 追加自定义缓存键（支持函数或属性路径数组）
      if (typeof opt.appendKey === 'function') {
        key += `$$appendKey=${opt.appendKey(req, res)}`;
      } else if (opt.appendKey.length > 0) {
        let appendKey = req;

        for (let i = 0; i < opt.appendKey.length; i++) {
          appendKey = appendKey[opt.appendKey[i]];
        }
        key += `$$appendKey=${appendKey}`;
      }

      // 尝试从缓存获取
      const redis = opt.redisClient;
      const cached = !redis ? this.memCache.getValue(key) : null;

      // 内存缓存命中
      if (cached) {
        const elapsed = (new Date() as any) - req.apicacheTimer;
        this.debug('sending cached (memory-cache) version of', key, logDuration(elapsed));

        perf.hit(key);
        return this.sendCachedResponse(req, res, cached, middlewareToggle, next, duration);
      }

      // Redis 缓存命中
      if (redis && redis.connected) {
        try {
          redis.hgetall(key, (err: any, obj: any) => {
            if (!err && obj && obj.response) {
              const elapsed = (new Date() as any) - req.apicacheTimer;
              this.debug('sending cached (redis) version of', key, logDuration(elapsed));

              perf.hit(key);
              return this.sendCachedResponse(req, res, JSON.parse(obj.response), middlewareToggle, next, duration);
            } else {
              // Redis 未命中，进入缓存写入流程
              perf.miss(key);
              return this.makeResponseCacheable(req, res, next, key, duration, String(strDuration), middlewareToggle);
            }
          });
        } catch {
          // Redis 出错时降级为未命中
          perf.miss(key);
          return this.makeResponseCacheable(req, res, next, key, duration, String(strDuration), middlewareToggle);
        }
      } else {
        // 无 Redis，内存也未命中，进入缓存写入流程
        perf.miss(key);
        return this.makeResponseCacheable(req, res, next, key, duration, String(strDuration), middlewareToggle);
      }
    };

    // 暴露 options 函数，允许运行时修改配置
    (cache as any).options = options;

    return cache;
  }

  /**
   * 设置或获取全局配置选项
   *
   * @param options 配置对象，不传则返回当前配置
   */
  options(options?: Record<string, any>): this | GlobalOptions {
    if (options) {
      Object.assign(this.globalOptions, options);
      this.syncOptions();

      if ('defaultDuration' in options) {
        // 将默认时长转换为毫秒数
        this.globalOptions.defaultDuration = this.parseDuration(this.globalOptions.defaultDuration, 3600000);
      }

      if (this.globalOptions.trackPerformance) {
        this.debug('WARNING: using trackPerformance flag can cause high memory usage!');
      }

      return this;
    } else {
      return this.globalOptions;
    }
  }

  /** 重置缓存索引（清空所有索引记录） */
  resetIndex(): void {
    this.index = {
      all: [],      // 所有缓存键
      groups: {},   // 分组索引 { groupName: [key...] }
    };
  }

  /** 创建新的 ApiCache 实例（可选配置） */
  newInstance(config?: Record<string, any>): ApiCache {
    const instance = new ApiCache();

    if (config) {
      instance.options(config);
    }

    return instance;
  }

  /** 克隆当前实例（复制配置） */
  clone(): ApiCache {
    return this.newInstance(this.options() as Record<string, any>);
  }
}

// 导出单例实例（整个应用共享一个缓存管理器）
export default new ApiCache();
