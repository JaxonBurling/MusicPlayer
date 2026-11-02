import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { Song, UserInfo, Playlist } from './api/index'
import {
  getSongUrl, getUserInfo as fetchUserInfo,
  getCookie, setCookie, clearCookie,
  getUserPlaylists, getLikedSongs, clearUserCache,
} from './api/index'
import { getCachedAudioUrl, cacheAudio } from './audio-cache'
import {
  bindMediaActions, clearMediaSession, syncMediaSession,
  syncPlaybackPosition, syncPlaybackState,
} from './media-session'

export type PlayMode = 'list' | 'random' | 'single'

export const useAppStore = defineStore('app', () => {
  // ========== 主题 ==========
  const darkMode = ref(false)
  /** 应用指定深色模式（各窗口共用，保证主题同步） */
  function applyDarkMode(value: boolean) {
    darkMode.value = value
    document.documentElement.classList.toggle('dark', value)
    localStorage.setItem('theme', value ? 'dark' : 'light')
  }
  function toggleDarkMode() {
    applyDarkMode(!darkMode.value)
  }

  // ========== 音源选择 ==========
  const source = ref<'kugou' | 'netease'>('kugou')
  function toggleSource() {
    source.value = source.value === 'kugou' ? 'netease' : 'kugou'
  }

  // ========== 登录状态 ==========
  const kugouLogin = ref(!!getCookie('kugou'))
  const neteaseLogin = ref(!!getCookie('netease'))
  const kugouUser = ref<UserInfo | null>(null)
  const neteaseUser = ref<UserInfo | null>(null)

  function isLoggedIn() { return source.value === 'kugou' ? kugouLogin.value : neteaseLogin.value }
  function currentUser() { return source.value === 'kugou' ? kugouUser.value : neteaseUser.value }

  function saveLogin(src: 'kugou' | 'netease', cookie: string, token?: string, userId?: string | number) {
    const cookieStr = token ? `token=${token};userid=${userId || ''}` : cookie
    setCookie(src, cookieStr)
    // 换账号后旧缓存不能复用
    clearUserCache(src)
    if (src === 'kugou') { kugouLogin.value = true; kugouUser.value = null }
    else { neteaseLogin.value = true; neteaseUser.value = null }
  }

  function logout(src: 'kugou' | 'netease') {
    clearCookie(src)
    clearUserCache(src)
    if (src === 'kugou') { kugouLogin.value = false; kugouUser.value = null }
    else { neteaseLogin.value = false; neteaseUser.value = null }
    if (source.value === src) { userPlaylists.value = []; userLikedSongs.value = [] }
  }

  async function loadUserInfo() {
    const src = source.value
    const info = await fetchUserInfo(src)
    if (!info) return
    // 请求期间可能已退出登录，避免把旧信息写回
    const stillLoggedIn = src === 'kugou' ? kugouLogin.value : neteaseLogin.value
    if (!stillLoggedIn) return
    if (src === 'kugou') { kugouUser.value = info; kugouLogin.value = true }
    else { neteaseUser.value = info; neteaseLogin.value = true }
  }

  // ========== 用户平台数据 ==========
  const userPlaylists = ref<Playlist[]>([])
  const userLikedSongs = ref<Song[]>([])
  const homeLoading = ref(false)

  async function loadUserPlatformData() {
    if (!isLoggedIn()) { userPlaylists.value = []; userLikedSongs.value = []; return }
    const src = source.value
    homeLoading.value = true
    try {
      const [playlists, liked] = await Promise.all([
        getUserPlaylists(src),
        getLikedSongs(src),
      ])
      // 加载期间已切换音源或退出登录，丢弃旧结果
      if (source.value !== src || !isLoggedIn()) return
      userPlaylists.value = playlists
      userLikedSongs.value = liked
    } catch { /* 加载失败不影响其他功能 */ }
    finally { if (source.value === src) homeLoading.value = false }
  }

  // ========== 播放器状态 ==========
  const currentSong = ref<Song | null>(null)
  const playlist = ref<Song[]>([])
  const playlistIndex = ref(-1)
  const isPlaying = ref(false)
  const audioUrl = ref('')
  const volume = ref(0.7)
  const playMode = ref<PlayMode>('list')
  const showPlayer = ref(false)
  /** 当前播放进度（秒），供播放页 / 歌词 / 系统媒体会话共用 */
  const currentTime = ref(0)
  const duration = ref(0)
  /** 歌曲播放页（从底部滑出） */
  const showNowPlaying = ref(false)

  /** 后台缓存整首音频（延迟 3 秒，避免刚切歌就抢占带宽） */
  const cacheTimers = new Map<string, ReturnType<typeof setTimeout>>()
  /** 播放序号：切歌后丢弃旧的异步请求结果 */
  let playToken = 0
  function scheduleAudioCache(song: Song, url: string) {
    const identity = song.hash || song.id
    if (!identity) return
    const key = `${song.source}:${identity}`
    const old = cacheTimers.get(key)
    if (old) clearTimeout(old)
    const timer = setTimeout(() => {
      cacheTimers.delete(key)
      // 用户已经切走就不再下载，减少无谓流量
      if (currentSong.value === song) void cacheAudio(song, url)
    }, 3000)
    cacheTimers.set(key, timer)
  }

  async function playSong(song: Song) {
    const token = ++playToken
    stopAudio()
    currentTime.value = 0
    duration.value = 0
    currentSong.value = song
    isPlaying.value = false
    audioUrl.value = ''
    showPlayer.value = true

    // 1. 优先读取本地音频缓存：命中后完全离线播放，不再请求网络
    const cachedUrl = await getCachedAudioUrl(song)
    if (token !== playToken) return // 期间已切歌，丢弃旧结果
    if (cachedUrl) {
      audioUrl.value = cachedUrl
      isPlaying.value = true
      return
    }

    // 离线且没有本地缓存：仍短暂尝试一次网络，失败后再提示
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false

    // 2. 未缓存则获取播放链接（URL 本身也有一层短期缓存）
    const result = await getSongUrl(song)
    if (token !== playToken) return // 期间已切歌，丢弃旧结果
    if (result.canPlay && result.url) {
      audioUrl.value = result.url
      isPlaying.value = true
      // 3. 在线播放后把音频缓存到本地，下次直接命中
      scheduleAudioCache(song, result.url)
    } else {
      ElMessage.warning(offline ? '当前离线，且该歌曲尚未缓存' : '无法获取播放链接，请稍后重试')
      console.warn('无法获取播放链接:', song.name)
    }
  }

  async function playFromList(index: number) {
    if (index < 0 || index >= playlist.value.length) return
    playlistIndex.value = index
    await playSong(playlist.value[index])
  }

  async function playList(songs: Song[], startIndex = 0) {
    playlist.value = songs
    await playFromList(startIndex)
  }

  function addToList(songs: Song[]) {
    playlist.value.push(...songs)
    showPlayer.value = true
  }

  function playNext(song: Song) {
    const insertIdx = playlistIndex.value + 1
    playlist.value.splice(insertIdx, 0, song)
  }

  /** 从播放列表移除歌曲 */
  function removeFromList(index: number) {
    if (index < 0 || index >= playlist.value.length) return
    playlist.value.splice(index, 1)
    if (index < playlistIndex.value) playlistIndex.value--
    else if (index === playlistIndex.value) {
      if (playlist.value.length === 0) {
        playlistIndex.value = -1; currentSong.value = null; isPlaying.value = false
      } else {
        const newIdx = Math.min(playlistIndex.value, playlist.value.length - 1)
        playFromList(newIdx)
      }
    }
  }

  /** 交换播放列表中两项的位置 */
  function swapInList(from: number, to: number) {
    const list = playlist.value
    if (from < 0 || from >= list.length || to < 0 || to >= list.length) return
    const [item] = list.splice(from, 1)
    list.splice(to, 0, item)
    // 更新当前播放索引
    if (playlistIndex.value === from) playlistIndex.value = to
    else if (from < to && playlistIndex.value > from && playlistIndex.value <= to) playlistIndex.value--
    else if (from > to && playlistIndex.value >= to && playlistIndex.value < from) playlistIndex.value++
  }

  async function prev() {
    const len = playlist.value.length
    if (len === 0) return
    let idx = playlistIndex.value - 1
    if (idx < 0) idx = len - 1
    await playFromList(idx)
  }

  async function next() {
    const len = playlist.value.length
    if (len === 0) return
    if (playMode.value === 'random') {
      await playFromList(Math.floor(Math.random() * len))
    } else if (playMode.value === 'single') {
      await playFromList(playlistIndex.value)
    } else {
      let idx = playlistIndex.value + 1
      if (idx >= len) idx = 0
      await playFromList(idx)
    }
  }

  function togglePlayMode() {
    const modes: PlayMode[] = ['list', 'random', 'single']
    playMode.value = modes[(modes.indexOf(playMode.value) + 1) % modes.length]
  }

  function togglePlay() { isPlaying.value = !isPlaying.value }

  // ========== 收藏 ==========
  const favorites = ref<Song[]>(loadFavorites())
  function loadFavorites(): Song[] {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]') } catch { return [] }
  }
  function saveFavorites() { localStorage.setItem('favorites', JSON.stringify(favorites.value)) }
  function isFavorite(song: Song): boolean {
    return favorites.value.some(s =>
      (song.source === 'kugou' && s.hash === song.hash) ||
      (song.source === 'netease' && s.id === song.id)
    )
  }
  function toggleFavorite(song: Song) {
    const idx = favorites.value.findIndex(s =>
      (song.source === 'kugou' && s.hash === song.hash) ||
      (song.source === 'netease' && s.id === song.id)
    )
    if (idx > -1) favorites.value.splice(idx, 1)
    else favorites.value.push({ ...song })
    saveFavorites()
  }

  // ========== 音频 / 播放进度 ==========
  let audioEl: HTMLAudioElement | null = null
  function setAudioElement(el: HTMLAudioElement) { audioEl = el }
  function stopAudio() {
    if (audioEl) { audioEl.pause(); audioEl.currentTime = 0 }
  }

  /** 播放器每次 timeupdate 调用，同时同步系统媒体进度（内部已节流） */
  function setPlaybackProgress(time: number, total: number) {
    currentTime.value = Number.isFinite(time) ? time : 0
    if (total > 0) duration.value = total
    syncPlaybackPosition(currentTime.value, duration.value)
  }

  /** 跳转到指定秒数（歌词双击 / 进度条 / 系统媒体拖动共用） */
  function seekTo(seconds: number) {
    if (!audioEl || !Number.isFinite(seconds)) return
    const max = audioEl.duration && Number.isFinite(audioEl.duration) ? audioEl.duration : seconds
    audioEl.currentTime = Math.max(0, Math.min(seconds, max))
    currentTime.value = audioEl.currentTime
    syncPlaybackPosition(currentTime.value, duration.value, true)
  }

  function openNowPlaying() {
    if (currentSong.value) showNowPlaying.value = true
  }
  function closeNowPlaying() {
    showNowPlaying.value = false
  }

  // 播放状态变化 → 同步系统媒体卡片
  watch(currentSong, (song) => {
    if (!song) {
      showNowPlaying.value = false
      void clearMediaSession()
      return
    }
    void syncMediaSession(song, {
      playing: isPlaying.value,
      position: 0,
      duration: duration.value,
      playMode: playMode.value,
    })
  })

  watch(isPlaying, (playing) => {
    if (!currentSong.value) return
    void syncPlaybackState({
      playing,
      position: currentTime.value,
      duration: duration.value,
      playMode: playMode.value,
    })
  })

  watch(playMode, (mode) => {
    if (!currentSong.value) return
    void syncPlaybackState({
      playing: isPlaying.value,
      position: currentTime.value,
      duration: duration.value,
      playMode: mode,
    })
  })

  // 音频元数据加载后补一次完整信息（尤其是总时长）
  watch(duration, (total) => {
    if (!currentSong.value || total <= 0) return
    void syncMediaSession(currentSong.value, {
      playing: isPlaying.value,
      position: currentTime.value,
      duration: total,
      playMode: playMode.value,
    })
  })

  // 浏览器标准媒体键（Tauri 下由 Rust 侧 SMTC 事件转发）
  bindMediaActions({
    play: () => { isPlaying.value = true },
    pause: () => { isPlaying.value = false },
    next: () => { void next() },
    previous: () => { void prev() },
    seek: (position) => seekTo(position),
  })

  return {
    darkMode, applyDarkMode, toggleDarkMode,
    source, toggleSource,
    kugouLogin, neteaseLogin, kugouUser, neteaseUser,
    isLoggedIn, currentUser, saveLogin, logout, loadUserInfo,
    userPlaylists, userLikedSongs, homeLoading, loadUserPlatformData,
    currentSong, playlist, playlistIndex, isPlaying, audioUrl, volume, playMode, showPlayer,
    currentTime, duration, showNowPlaying,
    playSong, playFromList, playList, addToList, playNext, removeFromList, swapInList,
    prev, next, togglePlay, togglePlayMode, setAudioElement,
    setPlaybackProgress, seekTo, openNowPlaying, closeNowPlaying,
    favorites, isFavorite, toggleFavorite,
  }
})
