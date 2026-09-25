/**
 * @fileoverview API 响应缓存中间件
 *
 * 基于 NeteaseCloudMusicApi 的 apicache 修改而来，提供 Express 中间件级别的缓存能力。
 *
 * @module util/apicache
 * @requires ./memory-cache - 内存缓存实现
 * @requires ./logger - 日志
 */

import MemoryCache from './memory-cache';
import logger from './logger';

/** 时间单位到毫秒的转换表 */
const t: Record<string, number> = {
  ms: 1,
  second: 1000,
  minute: 60000,
  hour: 3600000,
  day: 3600000 * 24,
  week: 3600000 * 24 * 7,
  month: 3600000 * 24 * 30,
};

/** 缓存索引 */
interface CacheIndex {
  all: string[];
  groups: Record<string, string[]>;
}

/** 全局配置 */
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

/** 缓存对象 */
interface CacheObject {
  status: number;
  headers: Record<string, any>;
  data: any;
  encoding: string;
  timestamp: number;
}

const instances: ApiCache[] = [];

const matches = (a: string) => (b: string) => a === b;
const doesntMatch = (a: string) => (b: string) => !matches(a)(b);

/** 格式化持续时间 */
const logDuration = (d: number, prefix?: string): string => {
  const str = d > 1000 ? (d / 1000).toFixed(2) + 'sec' : d + 'ms';
  return '\x1b[33m- ' + (prefix ? prefix + ' ' : '') + str + '\x1b[0m';
};

/** 安全获取响应头 */
function getSafeHeaders(res: any): Record<string, any> {
  return res.getHeaders ? res.getHeaders() : res._headers;
}

/** 空操作性能统计 */
class NOOPCachePerformance {
  report(): undefined {
    return undefined;
  }
  hit(_key: string): void {
    /* noop */
  }
  miss(_key: string): void {
    /* noop */
  }
}

/** 缓存命中率统计 */
class CachePerformance {
  hitsLast100 = new Uint8Array(100 / 4);
  hitsLast1000 = new Uint8Array(1000 / 4);
  hitsLast10000 = new Uint8Array(10000 / 4);
  hitsLast100000 = new Uint8Array(100000 / 4);
  callCount = 0;
  hitCount = 0;
  lastCacheHit: string | null = null;
  lastCacheMiss: string | null = null;

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
    if (total == 0) return null;
    return hits / total;
  }

  recordHitInArray(array: Uint8Array, hit: boolean): void {
    const arrayIndex = ~~(this.callCount / 4) % array.length;
    const bitOffset = (this.callCount % 4) * 2;
    const clearMask = ~(3 << bitOffset);
    const record = (hit ? 1 : 2) << bitOffset;
    array[arrayIndex] = (array[arrayIndex] & clearMask) | record;
  }

  recordHit(hit: boolean): void {
    this.recordHitInArray(this.hitsLast100, hit);
    this.recordHitInArray(this.hitsLast1000, hit);
    this.recordHitInArray(this.hitsLast10000, hit);
    this.recordHitInArray(this.hitsLast100000, hit);
    if (hit) this.hitCount++;
    this.callCount++;
  }

  hit(key: string): void {
    this.recordHit(true);
    this.lastCacheHit = key;
  }

  miss(key: string): void {
    this.recordHit(false);
    this.lastCacheMiss = key;
  }
}

/**
 * ApiCache 缓存中间件
 */
class ApiCache {
  id: number;
  private memCache = new MemoryCache<CacheObject>();
  private globalOptions: GlobalOptions = {
    debug: false,
    defaultDuration: 3600000,
    enabled: true,
    appendKey: [],
    jsonp: false,
    redisClient: false,
    headerBlacklist: [],
    statusCodes: {
      include: [],
      exclude: [],
    },
    events: {
      expire: undefined,
    },
    headers: {
      // 'cache-control':  'no-cache' // example of header overwrite
    },
    trackPerformance: false,
  };

  private middlewareOptions: { options: Record<string, any>; localOptions?: Record<string, any> }[] = [];
  private index: CacheIndex = { all: [], groups: {} };
  private timers: Record<string, ReturnType<typeof setTimeout>> = {};
  private performanceArray: (CachePerformance | NOOPCachePerformance)[] = [];

  constructor() {
    instances.push(this);
    this.id = instances.length;
    // initialize index
    this.resetIndex();
  }

  /** 调试日志 */
  private debug(a?: any, b?: any, c?: any, d?: any): any {
    const arr = ['\x1b[36m[apicache]\x1b[0m', a, b, c, d].filter(function (
      arg,
    ) {
      return arg !== undefined;
    });
    const debugEnv =
      process.env.DEBUG &&
      process.env.DEBUG.split(',').indexOf('apicache') !== -1;

    return (
      (this.globalOptions.debug || debugEnv) && console.log.apply(null, arr as any)
    );
  }

  /** 判断响应是否应该缓存 */
  private shouldCacheResponse(
    request: any,
    response: any,
    toggle?: (req: any, res: any) => boolean,
  ): boolean {
    const opt = this.globalOptions;
    const codes = opt.statusCodes;

    if (!response) return false;

    if (toggle && !toggle(request, response)) {
      return false;
    }

    if (
      codes.exclude &&
      codes.exclude.length &&
      codes.exclude.indexOf(response.statusCode) !== -1
    )
      return false;
    if (
      codes.include &&
      codes.include.length &&
      codes.include.indexOf(response.statusCode) === -1
    )
      return false;

    return true;
  }

  /** 将缓存键加入索引 */
  private addIndexEntries(key: string, req: any): void {
    const groupName = req.apicacheGroup;

    if (groupName) {
      this.debug('group detected "' + groupName + '"');
      const group = (this.index.groups[groupName] = this.index.groups[groupName] || []);
      group.unshift(key);
    }

    this.index.all.unshift(key);
  }

  /** 过滤黑名单响应头 */
  private filterBlacklistedHeaders(
    headers: Record<string, any>,
  ): Record<string, any> {
    return Object.keys(headers)
      .filter((key) => {
        return this.globalOptions.headerBlacklist.indexOf(key) === -1;
      })
      .reduce<Record<string, any>>((acc, header) => {
        acc[header] = headers[header];
        return acc;
      }, {});
  }

  /** 创建缓存对象 */
  private createCacheObject(
    status: number,
    headers: Record<string, any>,
    data: any,
    encoding: string,
  ): CacheObject {
    return {
      status,
      headers: this.filterBlacklistedHeaders(headers),
      data,
      encoding,
      // seconds since epoch.  This is used to properly decrement max-age headers in cached responses.
      timestamp: new Date().getTime() / 1000,
    };
  }

  /** 写入缓存 */
  private cacheResponse(key: string, value: CacheObject, duration: number): void {
    const redis = this.globalOptions.redisClient;
    const expireCallback = this.globalOptions.events.expire;

    if (redis && redis.connected) {
      try {
        redis.hset(key, 'response', JSON.stringify(value));
        redis.hset(key, 'duration', duration);
        redis.expire(key, duration / 1000, expireCallback || function () {});
      } catch {
        this.debug('[apicache] error in redis.hset()');
      }
    } else {
      this.memCache.add(key, value, duration, expireCallback);
    }

    // add automatic cache clearing from duration, includes max limit on setTimeout
    this.timers[key] = setTimeout(() => {
      this.clear(key, true);
    }, Math.min(duration, 2147483647));
  }

  /** 累积响应内容 */
  private accumulateContent(res: any, content: any): void {
    if (content) {
      if (typeof content == 'string') {
        res._apicache.content = (res._apicache.content || '') + content;
      } else if (Buffer.isBuffer(content)) {
        let oldContent = res._apicache.content;

        if (typeof oldContent === 'string') {
          oldContent = Buffer.from(oldContent);
        }

        if (!oldContent) {
          oldContent = Buffer.alloc(0);
        }

        res._apicache.content = Buffer.concat(
          [oldContent, content],
          oldContent.length + content.length,
        );
      } else {
        res._apicache.content = content;
      }
    }
  }

  /** 使响应可缓存（patch res 方法） */
  private makeResponseCacheable(
    req: any,
    res: any,
    next: (...args: any[]) => void,
    key: string,
    duration: number,
    strDuration: string,
    toggle?: (req: any, res: any) => boolean,
  ): void {
    // monkeypatch res.end to create cache object
    res._apicache = {
      write: res.write,
      writeHead: res.writeHead,
      end: res.end,
      cacheable: true,
      content: undefined,
    };

    // append header overwrites if applicable
    Object.keys(this.globalOptions.headers).forEach((name) => {
      res.setHeader(name, this.globalOptions.headers[name]);
    });

    res.writeHead = (...args: any[]) => {
      // add cache control headers
      if (!this.globalOptions.headers['cache-control']) {
        if (this.shouldCacheResponse(req, res, toggle)) {
          res.setHeader(
            'cache-control',
            'max-age=' + (duration / 1000).toFixed(0),
          );
        } else {
          res.setHeader('cache-control', 'no-cache, no-store, must-revalidate');
        }
      }

      res._apicache.headers = Object.assign({}, getSafeHeaders(res));
      return res._apicache.writeHead.apply(res, args);
    };

    res.write = (...args: any[]) => {
      this.accumulateContent(res, args[0]);
      return res._apicache.write.apply(res, args);
    };

    res.end = (...args: any[]) => {
      if (this.shouldCacheResponse(req, res, toggle)) {
        this.accumulateContent(res, args[0]);

        if (res._apicache.cacheable && res._apicache.content) {
          this.addIndexEntries(key, req);
          const headers = res._apicache.headers || getSafeHeaders(res);
          const cacheObject = this.createCacheObject(
            res.statusCode,
            headers,
            res._apicache.content,
            args[1],
          );
          this.cacheResponse(key, cacheObject, duration);

          // display log entry
          const elapsed = (new Date() as any) - req.apicacheTimer;
          this.debug(
            'adding cache entry for "' + key + '" @ ' + strDuration,
            logDuration(elapsed),
          );
          this.debug('_apicache.headers: ', res._apicache.headers);
          this.debug('res.getHeaders(): ', getSafeHeaders(res));
          this.debug('cacheObject: ', cacheObject);
        }
      }

      return res._apicache.end.apply(res, args);
    };

    next();
  }

  /** 发送缓存响应 */
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

    Object.assign(headers, this.filterBlacklistedHeaders(cacheObject.headers || {}), {
      // set properly-decremented max-age header.  This ensures that max-age is in sync with the cache expiration.
      'cache-control':
        'max-age=' +
        Math.max(
          0,
          Number(
            (
              duration / 1000 -
              (new Date().getTime() / 1000 - cacheObject.timestamp)
            ).toFixed(0),
          ),
        ),
    });

    // unstringify buffers
    let data = cacheObject.data;
    if (data && data.type === 'Buffer') {
      data = typeof data.data === 'number' ? Buffer.alloc(data.data) : Buffer.from(data.data);
    }

    // test Etag against If-None-Match for 304
    const cachedEtag = cacheObject.headers.etag;
    const requestEtag = request.headers['if-none-match'];

    if (requestEtag && cachedEtag === requestEtag) {
      response.writeHead(304, headers);
      return response.end();
    }

    response.writeHead(cacheObject.status || 200, headers);

    return response.end(data, cacheObject.encoding);
  }

  /** 同步全局配置到中间件 */
  private syncOptions(): void {
    for (const i in this.middlewareOptions) {
      Object.assign(
        this.middlewareOptions[i].options,
        this.globalOptions,
        this.middlewareOptions[i].localOptions,
      );
    }
  }

  /** 清除缓存 */
  clear(target?: string, isAutomatic?: boolean): CacheIndex | string[] {
    const group = target ? this.index.groups[target] : undefined;
    const redis = this.globalOptions.redisClient;

    if (group) {
      this.debug('clearing group "' + target + '"');

      group.forEach((key) => {
        this.debug('clearing cached entry for "' + key + '"');
        clearTimeout(this.timers[key]);
        delete this.timers[key];
        if (!this.globalOptions.redisClient) {
          this.memCache.delete(key);
        } else {
          try {
            redis.del(key);
          } catch {
            logger.info('[apicache] error in redis.del("' + key + '")');
          }
        }
        this.index.all = this.index.all.filter(doesntMatch(key));
      });

      delete this.index.groups[target!];
    } else if (target) {
      this.debug(
        'clearing ' +
          (isAutomatic ? 'expired' : 'cached') +
          ' entry for "' +
          target +
          '"',
      );
      clearTimeout(this.timers[target]);
      delete this.timers[target];
      // clear actual cached entry
      if (!redis) {
        this.memCache.delete(target);
      } else {
        try {
          redis.del(target);
        } catch {
          logger.info('[apicache] error in redis.del("' + target + '")');
        }
      }

      // remove from global index
      this.index.all = this.index.all.filter(doesntMatch(target));

      // remove target from each group that it may exist in
      Object.keys(this.index.groups).forEach((groupName) => {
        this.index.groups[groupName] = this.index.groups[groupName].filter(
          doesntMatch(target),
        );

        // delete group if now empty
        if (!this.index.groups[groupName].length) {
          delete this.index.groups[groupName];
        }
      });
    } else {
      this.debug('clearing entire index');

      if (!redis) {
        this.memCache.clear();
      } else {
        // clear redis keys one by one from internal index to prevent clearing non-apicache entries
        this.index.all.forEach((key) => {
          clearTimeout(this.timers[key]);
          delete this.timers[key];
          try {
            redis.del(key);
          } catch {
            logger.info('[apicache] error in redis.del("' + key + '")');
          }
        });
      }
      this.resetIndex();
    }

    return this.getIndex();
  }

  /** 解析时长 */
  private parseDuration(
    duration: number | string,
    defaultDuration: number,
  ): number {
    if (typeof duration === 'number') return duration;

    if (typeof duration === 'string') {
      const split = duration.match(/^([\d\.,]+)\s?(\w+)$/);

      if (split && split.length === 3) {
        const len = parseFloat(split[1]);
        let unit = split[2].replace(/s$/i, '').toLowerCase();
        if (unit === 'm') {
          unit = 'ms';
        }

        return (len || 1) * (t[unit] || 0);
      }
    }

    return defaultDuration;
  }

  /** 获取时长 */
  getDuration(duration: number | string): number {
    return this.parseDuration(duration, this.globalOptions.defaultDuration);
  }

  /** 获取性能统计 */
  getPerformance(): any[] {
    return this.performanceArray.map(function (p) {
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

  /** 创建缓存中间件 */
  middleware(
    strDuration: number | string,
    middlewareToggle?: (req: any, res: any) => boolean,
    localOptions?: Record<string, any>,
  ): any {
    const duration = this.getDuration(strDuration);
    const opt: Record<string, any> = {};

    this.middlewareOptions.push({
      options: opt,
    });

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

    const perf = this.globalOptions.trackPerformance
      ? new CachePerformance()
      : new NOOPCachePerformance();

    this.performanceArray.push(perf);

    const cache = (req: any, res: any, next: (...args: any[]) => void) => {
      function bypass() {
        return next();
      }

      // initial bypass chances
      if (!opt.enabled) return bypass();
      if (
        req.headers['x-apicache-bypass'] ||
        req.headers['x-apicache-force-fetch']
      )
        return bypass();

      // embed timer
      req.apicacheTimer = new Date();

      // In Express 4.x the url is ambigious based on where a router is mounted.  originalUrl will give the full Url
      let key =
        req.hostname + (req.originalUrl || req.url) + JSON.stringify(req.cookies);
      // Remove querystring from key if jsonp option is enabled
      if (opt.jsonp) {
        key = key.split('?')[0];
      }

      // add appendKey (either custom function or response path)
      if (typeof opt.appendKey === 'function') {
        key += '$$appendKey=' + opt.appendKey(req, res);
      } else if (opt.appendKey.length > 0) {
        let appendKey = req;

        for (let i = 0; i < opt.appendKey.length; i++) {
          appendKey = appendKey[opt.appendKey[i]];
        }
        key += '$$appendKey=' + appendKey;
      }

      // attempt cache hit
      const redis = opt.redisClient;
      const cached = !redis ? this.memCache.getValue(key) : null;

      // send if cache hit from memory-cache
      if (cached) {
        const elapsed = (new Date() as any) - req.apicacheTimer;
        this.debug(
          'sending cached (memory-cache) version of',
          key,
          logDuration(elapsed),
        );

        perf.hit(key);
        return this.sendCachedResponse(
          req,
          res,
          cached,
          middlewareToggle,
          next,
          duration,
        );
      }

      // send if cache hit from redis
      if (redis && redis.connected) {
        try {
          redis.hgetall(key, (err: any, obj: any) => {
            if (!err && obj && obj.response) {
              const elapsed = (new Date() as any) - req.apicacheTimer;
              this.debug(
                'sending cached (redis) version of',
                key,
                logDuration(elapsed),
              );

              perf.hit(key);
              return this.sendCachedResponse(
                req,
                res,
                JSON.parse(obj.response),
                middlewareToggle,
                next,
                duration,
              );
            } else {
              perf.miss(key);
              return this.makeResponseCacheable(
                req,
                res,
                next,
                key,
                duration,
                String(strDuration),
                middlewareToggle,
              );
            }
          });
        } catch {
          // bypass redis on error
          perf.miss(key);
          return this.makeResponseCacheable(
            req,
            res,
            next,
            key,
            duration,
            String(strDuration),
            middlewareToggle,
          );
        }
      } else {
        perf.miss(key);
        return this.makeResponseCacheable(
          req,
          res,
          next,
          key,
          duration,
          String(strDuration),
          middlewareToggle,
        );
      }
    };

    (cache as any).options = options;

    return cache;
  }

  /** 设置/获取全局配置 */
  options(options?: Record<string, any>): this | GlobalOptions {
    if (options) {
      Object.assign(this.globalOptions, options);
      this.syncOptions();

      if ('defaultDuration' in options) {
        // Convert the default duration to a number in milliseconds (if needed)
        this.globalOptions.defaultDuration = this.parseDuration(
          this.globalOptions.defaultDuration,
          3600000,
        );
      }

      if (this.globalOptions.trackPerformance) {
        this.debug(
          'WARNING: using trackPerformance flag can cause high memory usage!',
        );
      }

      return this;
    } else {
      return this.globalOptions;
    }
  }

  /** 重置索引 */
  resetIndex(): void {
    this.index = {
      all: [],
      groups: {},
    };
  }

  /** 创建新实例 */
  newInstance(config?: Record<string, any>): ApiCache {
    const instance = new ApiCache();

    if (config) {
      instance.options(config);
    }

    return instance;
  }

  /** 克隆实例 */
  clone(): ApiCache {
    return this.newInstance(this.options() as Record<string, any>);
  }
}

export default new ApiCache();
