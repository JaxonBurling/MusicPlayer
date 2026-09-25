/**
 * @fileoverview 基于 Map 的内存缓存实现
 * @module util/memory-cache
 */

/** 缓存条目 */
interface CacheEntry<T = any> {
  value: T;
  expire: number;
  timeout: ReturnType<typeof setTimeout>;
}

/** 过期回调 */
type TimeoutCallback<T = any> = (value: T, key: string) => void;

/**
 * MemoryCache 内存缓存
 */
class MemoryCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  size: number;

  constructor() {
    this.cache = new Map();
    this.size = 0;
  }

  /**
   * 添加缓存条目
   * @param key 缓存键
   * @param value 缓存值
   * @param time 过期时间（毫秒）
   * @param timeoutCallback 过期回调
   * @returns 缓存条目
   */
  add(
    key: string,
    value: T,
    time: number,
    timeoutCallback?: TimeoutCallback<T>,
  ): CacheEntry<T> {
    // 移除旧的条目（如果存在）
    const old = this.cache.get(key);
    if (old) {
      clearTimeout(old.timeout);
    }

    // 创建新的缓存条目
    const entry: CacheEntry<T> = {
      value,
      expire: time + Date.now(),
      timeout: setTimeout(() => {
        this.delete(key);
        if (typeof timeoutCallback === 'function') {
          timeoutCallback(value, key);
        }
      }, time),
    };

    this.cache.set(key, entry);
    this.size = this.cache.size;

    return entry;
  }

  /**
   * 删除缓存条目
   * @param key 缓存键
   * @returns 始终返回 null
   */
  delete(key: string): null {
    const entry = this.cache.get(key);
    if (entry) {
      clearTimeout(entry.timeout);
      this.cache.delete(key);
      this.size = this.cache.size;
    }
    return null;
  }

  /**
   * 获取缓存条目
   * @param key 缓存键
   * @returns 缓存条目或 null
   */
  get(key: string): CacheEntry<T> | null {
    return this.cache.get(key) || null;
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值或 undefined
   */
  getValue(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry ? entry.value : undefined;
  }

  /**
   * 清空缓存
   * @returns 始终返回 true
   */
  clear(): true {
    this.cache.forEach((entry) => clearTimeout(entry.timeout));
    this.cache.clear();
    this.size = 0;
    return true;
  }

  /**
   * 判断缓存是否存在且未过期
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expire) {
      this.delete(key);
      return false;
    }

    return true;
  }
}

export default MemoryCache;
