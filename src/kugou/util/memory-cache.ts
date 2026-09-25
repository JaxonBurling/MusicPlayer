/**
 * @fileoverview 基于内存的缓存实现
 *
 * 提供简单的键值对缓存，支持：
 * - 按时间自动过期（通过 setTimeout 实现）
 * - 过期回调通知
 * - 批量清除
 *
 * 作为 apicache 的底层存储引擎使用。
 *
 * @module memory-cache
 */

/** 缓存条目 */
interface CacheEntry<T = any> {
  value: T;
  /** 过期时间戳（毫秒） */
  expire: number;
  /** 自动过期定时器 */
  timeout: ReturnType<typeof setTimeout>;
}

/** 过期回调 */
type TimeoutCallback<T = any> = (value: T, key: string) => void;

/**
 * MemoryCache 内存缓存
 */
class MemoryCache<T = any> {
  /** 缓存数据存储 */
  private cache: Record<string, CacheEntry<T>>;
  /** 当前缓存条目数 */
  size: number;

  constructor() {
    this.cache = {};
    this.size = 0;
  }

  /**
   * 添加缓存条目
   *
   * @param key 缓存键
   * @param value 缓存值（任意类型）
   * @param time 过期时间（毫秒）
   * @param timeoutCallback 过期时的回调函数 (value, key) => void
   * @returns 创建的缓存条目
   */
  add(key: string, value: T, time: number, timeoutCallback?: TimeoutCallback<T>): CacheEntry<T> {
    const instance = this;

    const entry: CacheEntry<T> = {
      value,                        // 缓存的值
      expire: time + Date.now(),    // 过期时间戳（毫秒）
      timeout: setTimeout(function () {
        // 自动过期：删除条目并触发回调
        instance.delete(key);
        return timeoutCallback && typeof timeoutCallback === 'function' && timeoutCallback(value, key);
      }, time),
    };

    this.cache[key] = entry;
    this.size = Object.keys(this.cache).length;

    return entry;
  }

  /**
   * 删除缓存条目
   *
   * @param key 缓存键
   * @returns 始终返回 null
   */
  delete(key: string): null {
    const entry = this.cache[key];
    if (entry) clearTimeout(entry.timeout); // 清除自动过期定时器

    delete this.cache[key];

    this.size = Object.keys(this.cache).length;

    return null;
  }

  /**
   * 获取缓存条目（包含元数据）
   *
   * @param key 缓存键
   * @returns 缓存条目，不存在返回 undefined
   */
  get(key: string): CacheEntry<T> | undefined {
    return this.cache[key];
  }

  /**
   * 获取缓存的值（仅返回 value 部分）
   *
   * @param key 缓存键
   * @returns 缓存的值，不存在返回 undefined
   */
  getValue(key: string): T | undefined {
    const entry = this.get(key);

    return entry && entry.value;
  }

  /**
   * 清除所有缓存条目
   *
   * @returns 始终返回 true
   */
  clear(): true {
    Object.keys(this.cache).forEach((key) => {
      this.delete(key);
    });

    return true;
  }
}

export default MemoryCache;
