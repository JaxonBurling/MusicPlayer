/**
 * 歌曲音频本地缓存（IndexedDB）
 *
 * 首次播放某首歌时，先把远程音频下载为 Blob 存进 IndexedDB；
 * 之后再次播放同一首歌时直接生成 blob URL，不再发送音频请求，
 * 因此在离线 / 弱网环境下也能播放已经缓存过的歌曲。
 *
 * 使用 FIFO 策略控制容量（条数 + 总字节数），避免无限占用磁盘。
 */

import { httpFetch } from './api/http'

const DB_NAME = 'mp-audio-cache'
const STORE = 'audio'
const DB_VERSION = 1

/** 最多缓存 80 首 / 512 MB */
const MAX_ITEMS = 80
const MAX_TOTAL_BYTES = 512 * 1024 * 1024
/** 单曲超过 64 MB 不缓存（正常歌曲远小于该值） */
const MAX_FILE_BYTES = 64 * 1024 * 1024

export interface CacheableSong {
  source: 'kugou' | 'netease'
  id?: number
  hash?: string
}

interface AudioRecord {
  key: string
  name: string
  size: number
  /** 写入时间，用于 FIFO 淘汰 */
  used: number
  blob: Blob
}

let dbPromise: Promise<IDBDatabase | null> | null = null
const inflight = new Map<string, Promise<boolean>>()

/** 歌曲唯一标识；没有 id / hash 时不缓存 */
function audioKey(song: CacheableSong): string {
  const identity = song.source === 'kugou' ? song.hash : song.id
  return identity ? `${song.source}:${identity}` : ''
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' })
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }
  return dbPromise
}

function getRecord(key: string): Promise<AudioRecord | null> {
  return openDB().then((db) => {
    if (!db) return null
    return new Promise<AudioRecord | null>((resolve) => {
      try {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
        req.onsuccess = () => resolve((req.result as AudioRecord) ?? null)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  })
}

function getAllRecords(): Promise<AudioRecord[]> {
  return openDB().then((db) => {
    if (!db) return []
    return new Promise<AudioRecord[]>((resolve) => {
      try {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
        req.onsuccess = () => resolve((req.result as AudioRecord[]) ?? [])
        req.onerror = () => resolve([])
      } catch {
        resolve([])
      }
    })
  })
}

function putRecord(record: AudioRecord): Promise<boolean> {
  return openDB().then((db) => {
    if (!db) return false
    return new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(record)
        tx.oncomplete = () => resolve(true)
        tx.onerror = () => resolve(false)
        tx.onabort = () => resolve(false)
      } catch {
        resolve(false)
      }
    })
  })
}

function deleteRecords(keys: string[]): Promise<void> {
  return openDB().then((db) => {
    if (!db || keys.length === 0) return
    return new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite')
        const store = tx.objectStore(STORE)
        keys.forEach((key) => store.delete(key))
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
        tx.onabort = () => resolve()
      } catch {
        resolve()
      }
    })
  })
}

/** 容量超限时按写入时间淘汰最旧的缓存 */
async function prune(): Promise<void> {
  const records = await getAllRecords()
  let total = records.reduce((sum, item) => sum + item.size, 0)
  if (records.length <= MAX_ITEMS && total <= MAX_TOTAL_BYTES) return

  records.sort((a, b) => a.used - b.used)
  const remove: string[] = []
  let remaining = records.length
  for (const record of records) {
    if (remaining <= MAX_ITEMS && total <= MAX_TOTAL_BYTES) break
    remove.push(record.key)
    total -= record.size
    remaining--
  }
  await deleteRecords(remove)
}

/**
 * 读取本地缓存的歌曲，返回可直接播放的 blob URL。
 * 未缓存 / IndexedDB 不可用时返回 null。
 */
export async function getCachedAudioUrl(song: CacheableSong): Promise<string | null> {
  const key = audioKey(song)
  if (!key) return null

  try {
    const record = await getRecord(key)
    if (!record?.blob || record.blob.size === 0) return null
    return URL.createObjectURL(record.blob)
  } catch {
    return null
  }
}

/**
 * 下载并缓存歌曲音频。已在缓存中或正在下载时不会重复请求。
 * 失败时静默返回 false（不影响在线播放）。
 */
export function cacheAudio(song: CacheableSong, url: string): Promise<boolean> {
  const key = audioKey(song)
  if (!key || !url) return Promise.resolve(false)

  const running = inflight.get(key)
  if (running) return running

  const task = (async (): Promise<boolean> => {
    try {
      // 已缓存则不重复下载
      if (await getRecord(key)) return true

      const response = await httpFetch(url)
      if (!response.ok) return false

      const size = Number(response.headers.get('content-length') || 0)
      if (size > MAX_FILE_BYTES) return false

      const blob = await response.blob()
      if (blob.size === 0 || blob.size > MAX_FILE_BYTES) return false
      // 有些 CDN 失败时会返回 200 + HTML/JSON，避免把错误页当作音频缓存
      if (/text\/html|application\/json/i.test(blob.type)) return false

      // CDN 偶尔返回 application/octet-stream，补一个音频 MIME 便于 <audio> 解码
      const type = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'audio/mpeg'
      const audioBlob = type === blob.type ? blob : new Blob([blob], { type })

      const ok = await putRecord({
        key,
        name: url,
        size: audioBlob.size,
        used: Date.now(),
        blob: audioBlob,
      })
      if (ok) await prune()
      return ok
    } catch {
      // 浏览器 CORS / 网络中断 / 隐私模式等：静默放弃缓存
      return false
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, task)
  return task
}

/** 清空全部音频缓存（供后续设置页 / 调试使用） */
export async function clearAudioCache(): Promise<void> {
  const db = await openDB()
  if (!db) return
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })
}
