/**
 * 轻量本地缓存（localStorage）
 *
 * 约定：
 * - 数据在 ttl 内视为新鲜，直接返回本地缓存，不发起网络请求；
 * - 过期或未命中时才请求网络，请求失败（离线 / 弱网）回退到旧缓存；
 * - 网络返回空结果时保留旧缓存，避免一次异常把可用数据清空；
 * - 写入前会尝试清理最旧的缓存条目，防止 localStorage 配额溢出。
 */

const PREFIX = 'mp-cache:'
const VERSION = 1
const DEFAULT_TTL = 5 * 60_000
const DEFAULT_TIMEOUT = 6_000

interface Stored<T> {
  /** 缓存结构版本，升级后可自动失效 */
  v: number
  /** 写入时间戳 */
  t: number
  data: T
}

const memory = new Map<string, Stored<unknown>>()
/** 同一 key 的并发请求只发起一次 */
const pending = new Map<string, Promise<unknown>>()
/** 缓存代际：失效后阻止仍在途的旧请求把数据写回 */
let generation = 0

function storageKey(key: string): string {
  return PREFIX + key
}

/** 读取缓存（先读内存，再读 localStorage） */
export function readCache<T>(key: string): { data: T; time: number } | null {
  const k = storageKey(key)
  let entry = memory.get(k) as Stored<T> | undefined

  if (!entry) {
    try {
      const raw = localStorage.getItem(k)
      if (raw) {
        const parsed = JSON.parse(raw) as Stored<T>
        if (parsed?.v === VERSION) entry = parsed
        else localStorage.removeItem(k)
      }
    } catch {
      // 缓存损坏时当作未命中
    }
  }

  return entry ? { data: entry.data, time: entry.t } : null
}

/** 写入缓存；配额不足时淘汰旧条目后重试一次 */
export function writeCache<T>(key: string, data: T): void {
  const k = storageKey(key)
  const entry: Stored<T> = { v: VERSION, t: Date.now(), data }
  memory.set(k, entry)

  try {
    localStorage.setItem(k, JSON.stringify(entry))
  } catch {
    evictOldest()
    try {
      localStorage.setItem(k, JSON.stringify(entry))
    } catch {
      // 单条数据过大或空间仍不足：保留内存缓存，不影响本次使用
    }
  }
}

/** 删除指定 key 的缓存 */
export function removeCache(key: string): void {
  const k = storageKey(key)
  memory.delete(k)
  try {
    localStorage.removeItem(k)
  } catch {
    // ignore
  }
}

/** 按前缀批量失效缓存（如切换账号后清理该音源的数据） */
export function invalidateCache(prefix: string): void {
  generation++
  const full = storageKey(prefix)
  for (const key of [...memory.keys()]) {
    if (key.startsWith(full)) memory.delete(key)
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith(full)) localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}

/** 淘汰最早写入的四分之一缓存，腾出空间 */
function evictOldest(): void {
  const entries: Array<{ key: string; time: number }> = []

  for (const [key, entry] of memory) {
    if (key.startsWith(PREFIX)) entries.push({ key, time: entry.t })
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(PREFIX) || memory.has(key)) continue
      try {
        entries.push({ key, time: (JSON.parse(localStorage.getItem(key) || '{}') as Stored<unknown>).t || 0 })
      } catch {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // ignore
  }

  if (entries.length === 0) return
  entries.sort((a, b) => a.time - b.time)
  const count = Math.max(1, Math.floor(entries.length / 4))
  for (let i = 0; i < count; i++) {
    const key = entries[i].key
    memory.delete(key)
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}

/** 给网络请求加超时，弱网时尽快回退到缓存 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('cache request timeout')), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) },
    )
  })
}

export interface CacheQueryOptions<T> {
  /** 新鲜期（毫秒） */
  ttl?: number
  /** 网络超时（毫秒） */
  timeout?: number
  /** 判断网络结果是否可信；返回 false 时保留旧缓存 */
  accept?: (data: T) => boolean
}

/**
 * 缓存优先的查询：
 * 1. 命中且未过期 → 直接返回，不请求网络；
 * 2. 否则请求网络，成功则写入缓存；
 * 3. 网络失败 / 超时 / 结果不可信 → 返回旧缓存，没有旧缓存则返回 fallback。
 */
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  fallback: T,
  options: CacheQueryOptions<T> = {},
): Promise<T> {
  const { ttl = DEFAULT_TTL, timeout = DEFAULT_TIMEOUT, accept } = options
  const hit = readCache<T>(key)
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  const gen = generation

  // 明确离线：有缓存直接使用，避免等待请求超时
  if (offline && hit) return hit.data

  // 缓存仍然新鲜：直接使用本地数据
  if (hit && Date.now() - hit.time < ttl) return hit.data

  // 同一 key 正在请求中：复用同一个 Promise
  const running = pending.get(key)
  if (running) return running as Promise<T>

  const task = (async (): Promise<T> => {
    try {
      // 已有旧缓存时只需短暂尝试刷新；离线时即使没有缓存也快速失败
      const wait = offline ? Math.min(timeout, 2_000) : hit ? Math.min(timeout, 3_000) : timeout
      const data = await withTimeout(fetcher(), wait)
      if (accept && !accept(data)) {
        // 结果不可信（例如网络异常被上层吞掉后返回空数组），保留旧缓存
        return hit ? hit.data : data
      }
      // 请求期间缓存被失效（如退出登录），不再写回旧账号数据
      if (gen === generation) writeCache(key, data)
      return data
    } catch {
      // 离线 / 弱网：有旧缓存就用旧缓存
      return hit ? hit.data : fallback
    } finally {
      pending.delete(key)
    }
  })()

  pending.set(key, task)
  return task
}
