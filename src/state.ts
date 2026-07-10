import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Song, UserInfo, Playlist } from './api/index'
import {
  getSongUrl, getUserInfo as fetchUserInfo,
  getCookie, setCookie, clearCookie,
  getUserPlaylists, getLikedSongs,
} from './api/index'

export type PlayMode = 'list' | 'random' | 'single'

export const useAppStore = defineStore('app', () => {
  // ========== 主题 ==========
  const darkMode = ref(false)
  function toggleDarkMode() {
    darkMode.value = !darkMode.value
    document.documentElement.classList.toggle('dark', darkMode.value)
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

  function isLoggedIn() { return source.value === 'kugou' ? kugouLogin.value : neteaseLogin.value }
  function currentUser() { return source.value === 'kugou' ? kugouUser.value : neteaseUser.value }

  function saveLogin(src: 'kugou' | 'netease', cookie: string, token?: string, userId?: string | number) {
    const cookieStr = token ? `token=${token};userid=${userId || ''}` : cookie
    setCookie(src, cookieStr)
    if (src === 'kugou') kugouLogin.value = true
    else neteaseLogin.value = true
  }

  function logout(src: 'kugou' | 'netease') {
    clearCookie(src)
    if (src === 'kugou') { kugouLogin.value = false; kugouUser.value = null }
    else { neteaseLogin.value = false; neteaseUser.value = null }
  }

  async function loadUserInfo() {
    const info = await fetchUserInfo(source.value)
    if (info) {
      if (source.value === 'kugou') { kugouUser.value = info; kugouLogin.value = true }
      else { neteaseUser.value = info; neteaseLogin.value = true }
    }
  }

  // ========== 用户平台数据 ==========
  const userPlaylists = ref<Playlist[]>([])
  const userLikedSongs = ref<Song[]>([])
  const homeLoading = ref(false)

  async function loadUserPlatformData() {
    if (!isLoggedIn()) { userPlaylists.value = []; userLikedSongs.value = []; return }
    homeLoading.value = true
    try {
      const [playlists, liked] = await Promise.all([
        getUserPlaylists(source.value),
        getLikedSongs(source.value),
      ])
      userPlaylists.value = playlists
      userLikedSongs.value = liked
    } catch { /* 加载失败不影响其他功能 */ }
    finally { homeLoading.value = false }
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

  // ========== 音频 ==========
  let audioEl: HTMLAudioElement | null = null
  function setAudioElement(el: HTMLAudioElement) { audioEl = el }
  function stopAudio() {
    if (audioEl) { audioEl.pause(); audioEl.currentTime = 0 }
  }

  return {
    darkMode, toggleDarkMode,
    source, toggleSource,
    kugouLogin, neteaseLogin, kugouUser, neteaseUser,
    isLoggedIn, currentUser, saveLogin, logout, loadUserInfo,
    userPlaylists, userLikedSongs, homeLoading, loadUserPlatformData,
    currentSong, playlist, playlistIndex, isPlaying, audioUrl, volume, playMode, showPlayer,
    playSong, playFromList, playList, addToList, playNext, removeFromList, swapInList,
    prev, next, togglePlay, togglePlayMode, setAudioElement,
    favorites, isFavorite, toggleFavorite,
  }
})
