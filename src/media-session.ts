/**
 * 系统媒体会话桥接
 *
 * - Tauri 环境下使用 tauri-plugin-media，把歌名 / 歌手 / 专辑 / 封面 / 播放状态
 *   同步到 Windows SMTC、macOS Now Playing、Linux MPRIS。
 * - 浏览器环境下回退到标准的 Media Session API。
 *
 * 所有调用都做了降级处理：插件不可用、权限缺失或封面加载失败时，
 * 只记录一次警告，不影响播放器本身。
 */
import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './api/http'
import type { Song } from './api/index'
import {
  PlaybackStatus,
  RepeatMode,
  mediaControls,
  setMetadata as pluginSetMetadata,
  setPlaybackInfo as pluginSetPlaybackInfo,
  setPosition as pluginSetPosition,
  clearMetadata as pluginClearMetadata,
} from 'tauri-plugin-media-api'

export type MediaPlayMode = 'list' | 'random' | 'single'

export interface MediaSessionOptions {
  playing: boolean
  position?: number
  duration?: number
  playMode?: MediaPlayMode
}

export interface MediaActions {
  play: () => void
  pause: () => void
  next: () => void
  previous: () => void
  seek: (position: number) => void
}

const APP_ID = 'top.ovps.music'
const APP_NAME = 'MusicPlayer'

/** 插件不可用（权限缺失 / 平台不支持）后不再重复调用 */
let pluginBroken = !isTauri
let warned = false
/** 插件初始化 Promise（在 WebView 创建完成后再由前端触发，避免 COM 冲突） */
let pluginReady: Promise<boolean> | null = null
/** 切歌序号，避免旧歌曲的异步元数据覆盖新歌曲 */
let sessionToken = 0
let lastPositionAt = 0

function warnOnce(error: unknown) {
  if (warned) return
  warned = true
  console.warn('[media-session] 系统媒体会话不可用，已自动降级:', error)
}

/** 初始化系统媒体会话；只执行一次，失败后走浏览器 Media Session 降级 */
function ensurePlugin(): Promise<boolean> {
  if (!isTauri || pluginBroken) return Promise.resolve(false)
  if (!pluginReady) {
    pluginReady = mediaControls
      .initialize(APP_ID, APP_NAME)
      .then(async () => {
        // 媒体键绑定是可选项，失败不影响歌曲信息展示
        try {
          await invoke('bind_media_events')
        } catch {
          // ignore
        }
        return true
      })
      .catch((error) => {
        pluginBroken = true
        warnOnce(error)
        return false
      })
  }
  return pluginReady
}

/** Kugou 的部分接口返回毫秒，这里统一成秒 */
function durationOf(song: Song, duration?: number): number | undefined {
  if (duration && Number.isFinite(duration) && duration > 0) return duration
  const raw = song.duration || 0
  if (!raw || !Number.isFinite(raw)) return undefined
  return song.source === 'kugou' && raw > 1000 ? raw / 1000 : raw
}

function coverOf(song: Song): string | undefined {
  if (!song.pic) return undefined
  return song.pic.startsWith('http://') ? song.pic.replace('http://', 'https://') : song.pic
}

function repeatModeOf(mode: MediaPlayMode = 'list'): RepeatMode {
  if (mode === 'single') return RepeatMode.Track
  if (mode === 'random') return RepeatMode.None
  return RepeatMode.List
}

function playbackInfo(options: MediaSessionOptions) {
  return {
    status: options.playing ? PlaybackStatus.Playing : PlaybackStatus.Paused,
    position: options.position || 0,
    shuffle: options.playMode === 'random',
    repeatMode: repeatModeOf(options.playMode),
    playbackRate: 1,
  }
}

/** 浏览器标准 Media Session：插件不可用或非 Tauri 环境下使用 */
function updateWebMetadata(song: Song | null, options: MediaSessionOptions, force = false) {
  if ((isTauri && !force) || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  if (!song) {
    navigator.mediaSession.metadata = null
    navigator.mediaSession.playbackState = 'none'
    return
  }
  if (typeof MediaMetadata === 'undefined') return
  const artwork = coverOf(song)
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.name || '未知歌曲',
    artist: song.artist || '',
    album: song.album || '',
    artwork: artwork ? [{ src: artwork, sizes: '512x512' }] : [],
  })
  navigator.mediaSession.playbackState = options.playing ? 'playing' : 'paused'
  const duration = durationOf(song, options.duration)
  if (duration && 'setPositionState' in navigator.mediaSession) {
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(options.position || 0, duration),
        playbackRate: 1,
      })
    } catch {
      // 忽略不支持的浏览器
    }
  }
}

async function pushPluginMetadata(song: Song, duration?: number): Promise<boolean> {
  const base = {
    title: song.name || '未知歌曲',
    artist: song.artist || undefined,
    album: song.album || undefined,
    albumArtist: song.artist || undefined,
    duration,
  }
  try {
    await pluginSetMetadata({ ...base, artworkUrl: coverOf(song) })
    return true
  } catch {
    // 某些系统在封面 URL 无法访问时会整体失败，去掉封面再试一次
    try {
      await pluginSetMetadata(base)
      return true
    } catch (error) {
      warnOnce(error)
      return false
    }
  }
}

/** 切歌时同步完整信息 */
export async function syncMediaSession(song: Song, options: MediaSessionOptions): Promise<void> {
  const token = ++sessionToken
  const available = await ensurePlugin()
  if (!available) {
    updateWebMetadata(song, options, true)
    return
  }

  if (token !== sessionToken) return
  const duration = durationOf(song, options.duration)
  const ok = await pushPluginMetadata(song, duration)
  if (!ok) {
    pluginBroken = true
    updateWebMetadata(song, options, true)
    return
  }
  if (token !== sessionToken) return
  try {
    await pluginSetPlaybackInfo(playbackInfo({ ...options, duration }))
  } catch (error) {
    warnOnce(error)
  }
}

/** 只更新播放 / 暂停、循环模式等状态 */
export async function syncPlaybackState(options: MediaSessionOptions): Promise<void> {
  const updateWeb = () => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = options.playing ? 'playing' : 'paused'
    }
  }

  if (!(await ensurePlugin())) {
    updateWeb()
    return
  }
  try {
    await pluginSetPlaybackInfo(playbackInfo(options))
  } catch (error) {
    warnOnce(error)
  }
}

/** 播放进度：节流到 3 秒一次，避免高频 IPC；手动跳转时 force 立即同步 */
export function syncPlaybackPosition(position: number, duration?: number, force = false): void {
  const updateWeb = () => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    if (!duration || !('setPositionState' in navigator.mediaSession)) return
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(Math.max(position, 0), duration),
        playbackRate: 1,
      })
    } catch {
      // ignore
    }
  }

  if (!isTauri || pluginBroken) {
    updateWeb()
    return
  }
  const now = Date.now()
  if (!force && now - lastPositionAt < 3000) return
  lastPositionAt = now
  void pluginSetPosition(Math.max(0, position)).catch(() => updateWeb())
}

/** 停止播放 / 清空歌曲时清理系统媒体卡片 */
export async function clearMediaSession(): Promise<void> {
  sessionToken++
  updateWebMetadata(null, { playing: false }, true)
  if (!(await ensurePlugin())) return
  try {
    await pluginClearMetadata()
  } catch (error) {
    warnOnce(error)
  }
}

/** 绑定浏览器标准媒体键；插件不支持事件回调时作为兜底 */
export function bindMediaActions(actions: MediaActions): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  const session = navigator.mediaSession
  const bind = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      session.setActionHandler(action, handler)
    } catch {
      // 浏览器不支持该动作
    }
  }
  bind('play', () => actions.play())
  bind('pause', () => actions.pause())
  bind('nexttrack', () => actions.next())
  bind('previoustrack', () => actions.previous())
  bind('stop', () => actions.pause())
  bind('seekto', (details) => {
    if (typeof details.seekTime === 'number') actions.seek(details.seekTime)
  })
}
