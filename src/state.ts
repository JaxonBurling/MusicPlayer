import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Song, UserInfo } from './api/index'
import { getSongUrl, getUserInfo as fetchUserInfo, getCookie, setCookie, clearCookie } from './api/index'

export type PlayMode = 'list' | 'random' | 'single'

export const useAppStore = defineStore('app', () => {
  // ========== 主题 ==========
  const darkMode = ref(false)

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
    if (darkMode.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', darkMode.value ? 'dark' : 'light')
  }

  // ========== 音源选择 ==========
  const source = ref<'kugou' | 'netease'>('netease')

  function toggleSource() {
    source.value = source.value === 'kugou' ? 'netease' : 'kugou'
  }

  // ========== 登录状态 ==========
  const kugouLogin = ref(!!getCookie('kugou'))
  const neteaseLogin = ref(!!getCookie('netease'))
  const kugouUser = ref<UserInfo | null>(null)
  const neteaseUser = ref<UserInfo | null>(null)

  /** 当前音源是否已登录 */
  function isLoggedIn() {
    return source.value === 'kugou' ? kugouLogin.value : neteaseLogin.value
  }

  /** 当前音源的用户信息 */
  function currentUser() {
    return source.value === 'kugou' ? kugouUser.value : neteaseUser.value
  }

  /** 保存登录凭证 */
  function saveLogin(src: 'kugou' | 'netease', cookie: string, token?: string, userId?: string | number) {
    const cookieStr = token ? `token=${token};userid=${userId || ''}` : cookie
    setCookie(src, cookieStr)
    if (src === 'kugou') {
      kugouLogin.value = true
    } else {
      neteaseLogin.value = true
    }
  }

  /** 退出登录 */
  function logout(src: 'kugou' | 'netease') {
    clearCookie(src)
    if (src === 'kugou') {
      kugouLogin.value = false
      kugouUser.value = null
    } else {
      neteaseLogin.value = false
      neteaseUser.value = null
    }
  }

  /** 加载当前音源用户信息 */
  async function loadUserInfo() {
    const info = await fetchUserInfo(source.value)
    if (info) {
      if (source.value === 'kugou') {
        kugouUser.value = info
        kugouLogin.value = true
      } else {
        neteaseUser.value = info
        neteaseLogin.value = true
      }
    }
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

  async function playSong(song: Song) {
    stopAudio()
    currentSong.value = song
    isPlaying.value = false
    audioUrl.value = ''

    const result = await getSongUrl(song)
    if (result.canPlay && result.url) {
      audioUrl.value = result.url
      isPlaying.value = true
      showPlayer.value = true
    } else {
      showPlayer.value = true
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
      const randomIdx = Math.floor(Math.random() * len)
      await playFromList(randomIdx)
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
    const idx = modes.indexOf(playMode.value)
    playMode.value = modes[(idx + 1) % modes.length]
  }

  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }

  // ========== 收藏 ==========
  const favorites = ref<Song[]>(loadFavorites())

  function loadFavorites(): Song[] {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]') } catch { return [] }
  }

  function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites.value))
  }

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
    if (idx > -1) {
      favorites.value.splice(idx, 1)
    } else {
      favorites.value.push({ ...song })
    }
    saveFavorites()
  }

  // ========== 音频 ==========
  let audioEl: HTMLAudioElement | null = null
  function setAudioElement(el: HTMLAudioElement) { audioEl = el }
  function stopAudio() {
    if (audioEl) { audioEl.pause(); audioEl.currentTime = 0 }
  }

  return {
    darkMode, toggleDarkMode,
    source, toggleSource,
    // 登录
    kugouLogin, neteaseLogin, kugouUser, neteaseUser,
    isLoggedIn, currentUser, saveLogin, logout, loadUserInfo,
    // 播放器
    currentSong, playlist, playlistIndex, isPlaying, audioUrl, volume, playMode, showPlayer,
    playSong, playFromList, playList, addToList, playNext, prev, next, togglePlay, togglePlayMode,
    setAudioElement,
    // 收藏
    favorites, isFavorite, toggleFavorite,
  }
})
