/**
 * API 服务层
 *
 * 直接使用进程内的酷狗 / 网易云官方 API SDK（./kugou、./netease），
 * 不再依赖任何本地 Node 服务或 sidecar。
 */

import QRCode from 'qrcode'
import { KugouClient } from './kugou'
import { NeteaseClient } from './netease'
import { httpFetch } from './http'

export interface Song {
  id?: number
  hash?: string
  name: string
  artist: string
  album: string
  pic?: string
  duration?: number
  source: 'kugou' | 'netease'
}

export interface SearchParams {
  keywords: string
  page?: number
  limit?: number
  source: 'kugou' | 'netease'
}

export interface SongUrlResult {
  url: string
  canPlay: boolean
}

export interface UserInfo {
  id: string | number
  nickname: string
  avatarUrl: string
  vip?: boolean
}

export interface LoginCredential {
  token?: string
  cookie?: string
  userId?: string | number
}

/** 歌单 */
export interface Playlist {
  id: string | number
  name: string
  coverUrl: string
  trackCount: number
  source: 'kugou' | 'netease'
}

// ===================== Client 实例 =====================

/** 酷狗使用概念版（youth / lite） */
const kg = new KugouClient({
  platform: 'lite',
  cookie: localStorage.getItem('kugou_cookie') || undefined,
  fetch: httpFetch,
})

const ne = new NeteaseClient({
  cookie: localStorage.getItem('netease_cookie') || undefined,
  fetch: httpFetch,
})

function persist(source: 'kugou' | 'netease') {
  const value = source === 'kugou' ? kg.cookieString : ne.getCookie()
  localStorage.setItem(`${source}_cookie`, value)
}

function kugouAuthed(): boolean {
  const cookie = kg.getCookies()
  return Boolean(cookie.token || cookie.userid)
}

function neteaseAuthed(): boolean {
  const cookie = ne.getCookieObject()
  return Boolean(cookie.MUSIC_U)
}

// ===================== Cookie 管理 =====================

export function getCookie(source: 'kugou' | 'netease'): string {
  if (source === 'kugou') return kugouAuthed() ? kg.cookieString : ''
  return neteaseAuthed() ? ne.getCookie() : ''
}

export function setCookie(source: 'kugou' | 'netease', cookie: string) {
  if (source === 'kugou') {
    kg.setCookies(cookie)
  } else {
    ne.setCookie(cookie)
  }
  persist(source)
}

export function clearCookie(source: 'kugou' | 'netease') {
  if (source === 'kugou') {
    kg.clearAuth()
    localStorage.removeItem('kugou_cookie')
  } else {
    ne.clearCookie()
    localStorage.removeItem('netease_cookie')
  }
}

// ===================== 搜索 =====================

export async function searchSongs(params: SearchParams): Promise<Song[]> {
  return params.source === 'kugou' ? searchKugou(params) : searchNetease(params)
}

async function searchKugou(params: SearchParams): Promise<Song[]> {
  try {
    const res = await kg.search({
      keywords: params.keywords,
      page: params.page || 1,
      pagesize: params.limit || 30,
      type: 'song',
    })
    const data: any = res.body
    if (data?.error_code || !data?.data?.lists) return []
    return data.data.lists.map((item: any) => ({
      hash: item.FileHash || item.hash,
      name: item.OriSongName || item.songname || '',
      artist: item.SingerName || item.singername || '',
      album: item.AlbumName || item.album_name || '',
      duration: item.Duration || item.duration,
      pic: (item.Image || item.pic || '').replace('{size}', '128'),
      source: 'kugou' as const,
    }))
  } catch {
    return []
  }
}

async function searchNetease(params: SearchParams): Promise<Song[]> {
  const limit = params.limit || 30
  const offset = ((params.page || 1) - 1) * limit
  try {
    const data: any = await ne.cloudSearch(params.keywords, { limit, offset, type: 1 })
    if (data.code !== 200 || !data.result?.songs) return []
    return data.result.songs.map((item: any) => ({
      id: item.id,
      name: item.name || '',
      artist: (item.ar || []).map((a: any) => a.name).join('/'),
      album: item.al?.name || '',
      pic: item.al?.picUrl,
      duration: Math.floor((item.dt || 0) / 1000),
      source: 'netease' as const,
    }))
  } catch {
    return []
  }
}

// ===================== 歌曲 URL =====================

export async function getSongUrl(song: Song): Promise<SongUrlResult> {
  return song.source === 'kugou' ? getKugouUrl(song) : getNeteaseUrl(song)
}

async function getKugouUrl(song: Song): Promise<SongUrlResult> {
  if (!song.hash) return { url: '', canPlay: false }
  try {
    const res = await kg.getSongUrl({ hash: song.hash })
    persist('kugou')
    const data: any = res.body
    const url = data?.url?.[0] || data?.data?.[0]?.url || data?.data?.url?.[0]
    if (!url) return { url: '', canPlay: false }
    return { url, canPlay: true }
  } catch {
    return { url: '', canPlay: false }
  }
}

async function getNeteaseUrl(song: Song): Promise<SongUrlResult> {
  if (!song.id) return { url: '', canPlay: false }
  try {
    await ensureNeteaseAnonymous()
    const data: any = await ne.songUrl(song.id, { level: 'exhigh' })
    persist('netease')
    if (data.code !== 200 || !data.data?.[0]?.url) return { url: '', canPlay: false }
    return { url: data.data[0].url, canPlay: true }
  } catch {
    return { url: '', canPlay: false }
  }
}

let anonymousReady: Promise<void> | null = null

/** 未登录时确保已获取匿名 token（失败不阻塞） */
async function ensureNeteaseAnonymous(): Promise<void> {
  if (neteaseAuthed() || ne.getCookieObject().MUSIC_A) return
  if (!anonymousReady) {
    anonymousReady = ne
      .registerAnonymous()
      .then(() => {
        persist('netease')
      })
      .catch(() => undefined)
      .finally(() => {
        anonymousReady = null
      })
  }
  await anonymousReady
}

// ===================== 歌词 =====================

export async function getLyric(song: Song): Promise<string> {
  if (song.source !== 'netease' || !song.id) return ''
  try {
    const data: any = await ne.lyric(song.id)
    if (data.code === 200 && data.lrc?.lyric) return data.lrc.lyric
  } catch {
    // ignore
  }
  return ''
}

// ===================== 登录 =====================

/** 获取二维码 key 和图片（酷狗 key 接口直接返回图片，无需二次请求） */
export async function getQrKey(
  source: 'kugou' | 'netease',
): Promise<{ key: string; image?: string }> {
  if (source === 'kugou') {
    const res = await kg.loginQrKey()
    const d: any = (res.body as any)?.data || {}
    return { key: d.qrcode || d.token || d.key || '', image: d.qrcode_img || '' }
  }
  const data: any = await ne.loginQrKey()
  return { key: data.unikey || data.data?.unikey || '' }
}

/** 生成二维码（仅网易云需要此步骤；酷狗已在 getQrKey 返回图片） */
export async function createQr(source: 'kugou' | 'netease', key: string): Promise<string> {
  if (source === 'kugou') {
    const url = `https://h5.kugou.com/apps/loginQRCode/html/index.html?qrcode=${key}`
    return QRCode.toDataURL(url)
  }
  const res = await ne.loginQrCreate(key, {
    renderQr: (url) => QRCode.toDataURL(url),
  })
  return res.data?.qrimg || ''
}

export async function checkQr(
  source: 'kugou' | 'netease',
  key: string,
): Promise<{
  status: 'waiting' | 'scanned' | 'expired' | 'success'
  credential: LoginCredential | null
}> {
  if (source === 'kugou') {
    try {
      const res = await kg.loginQrCheck(key)
      const data: any = res.body
      const code = data?.data?.status ?? data?.status ?? 0
      if (code === 4) {
        persist('kugou')
        return {
          status: 'success',
          credential: { token: data.data?.token, userId: data.data?.userid },
        }
      }
      if (code === 2) return { status: 'scanned', credential: null }
      if (code === 0) return { status: 'expired', credential: null }
      return { status: 'waiting', credential: null }
    } catch {
      return { status: 'waiting', credential: null }
    }
  }

  try {
    const data: any = await ne.loginQrCheck(key)
    const code = Number(data.code)
    if (code === 803) {
      if (typeof data.cookie === 'string') ne.setCookie(data.cookie)
      persist('netease')
      return { status: 'success', credential: { cookie: ne.getCookie() } }
    }
    if (code === 802) return { status: 'scanned', credential: null }
    if (code === 800) return { status: 'expired', credential: null }
    return { status: 'waiting', credential: null }
  } catch {
    return { status: 'waiting', credential: null }
  }
}

export async function sendCaptcha(source: 'kugou' | 'netease', phone: string): Promise<boolean> {
  try {
    if (source === 'kugou') {
      const res = await kg.sendCaptcha({ mobile: phone })
      const data: any = res.body
      return data.code === 200 || data.status === 1 || !!data.data
    }
    const data: any = await ne.request(
      '/api/sms/captcha/sent',
      { cellphone: phone, ctcode: '86' },
      { crypto: 'weapi' },
    )
    return data.code === 200
  } catch {
    return false
  }
}

export async function loginByPhone(
  source: 'kugou' | 'netease',
  phone: string,
  code: string,
): Promise<LoginCredential | null> {
  try {
    if (source === 'kugou') {
      const res = await kg.loginCellphone({ mobile: phone, code })
      const data: any = res.body
      if (data.status === 1 || data.data?.token) {
        persist('kugou')
        return { token: data.data?.token, userId: data.data?.userid }
      }
      return null
    }
    const data: any = await ne.loginByCellphone({ phone, captcha: code })
    if (data.code === 200) {
      if (typeof data.cookie === 'string') ne.setCookie(data.cookie)
      persist('netease')
      // 网易云必须使用完整 cookie（MUSIC_U 等），不要走 token 快捷路径
      return { cookie: ne.getCookie() }
    }
    return null
  } catch {
    return null
  }
}

// ===================== 用户信息 =====================

export async function getUserInfo(source: 'kugou' | 'netease'): Promise<UserInfo | null> {
  if (source === 'kugou') {
    if (!kugouAuthed()) return null
    try {
      const res = await kg.getUserDetail()
      const data: any = res.body
      if (data.status === 1 && data.data) {
        return {
          id: data.data.userid || data.data.userId,
          nickname: data.data.username || data.data.nickname || '',
          avatarUrl: data.data.avatar || data.data.pic || '',
        }
      }
    } catch {
      // ignore
    }
    return null
  }

  if (!neteaseAuthed()) return null
  try {
    const data: any = await ne.userAccount()
    if (data.code === 200 && data.profile) {
      return {
        id: data.profile.userId,
        nickname: data.profile.nickname,
        avatarUrl: data.profile.avatarUrl,
        vip: data.profile.vipType > 0,
      }
    }
  } catch {
    // ignore
  }
  return null
}

// ===================== 用户歌单 =====================

/** 获取用户歌单列表 */
export async function getUserPlaylists(source: 'kugou' | 'netease'): Promise<Playlist[]> {
  if (source === 'kugou') {
    if (!kugouAuthed()) return []
    try {
      const res = await kg.getUserPlaylists({ page: 1, pagesize: 100 })
      const data: any = res.body
      if (data.status === 1 && data.data?.info) {
        return data.data.info.map((item: any) => ({
          id: item.global_collection_id || item.list_create_listid || item.listid,
          name: item.name || item.title || item.specialname || '',
          coverUrl: (item.pic || '').replace('{size}', '400'),
          trackCount: parseInt(item.count) || item.songcount || item.track_count || 0,
          source: 'kugou' as const,
        }))
      }
    } catch {
      // ignore
    }
    return []
  }

  const user = await getUserInfo('netease')
  if (!user) return []
  try {
    const data: any = await ne.userPlaylist(user.id, { limit: 1000 })
    if (data.code === 200 && data.playlist) {
      return data.playlist.map((item: any) => ({
        id: item.id,
        name: item.name,
        coverUrl: item.coverImgUrl || '',
        trackCount: item.trackCount || 0,
        source: 'netease' as const,
      }))
    }
  } catch {
    // ignore
  }
  return []
}

/** 获取歌单中的歌曲 */
export async function getPlaylistSongs(
  source: 'kugou' | 'netease',
  playlistId: string | number,
): Promise<Song[]> {
  if (source === 'kugou') {
    if (!kugouAuthed()) return []
    try {
      const res = await kg.request({
        url: '/pubsongs/v2/get_other_list_file_nofilt',
        method: 'GET',
        params: {
          area_code: 1,
          begin_idx: 0,
          plat: 1,
          type: 1,
          mode: 1,
          personal_switch: 1,
          extend_fields: 'abtags,hot_cmt,popularization',
          pagesize: 50,
          global_collection_id: playlistId,
        },
        encryptType: 'android',
      })
      const data: any = res.body
      if (data.status === 1 && data.data?.songs) {
        return data.data.songs.map((item: any) => ({
          pic: (item.cover || '').replace('{size}', '128') || (item.pic || '').replace('{size}', '128') || '',
          hash: item.FileHash || item.hash,
          name:
            item.SongName ||
            item.songname ||
            (item.name || '').slice((item.name || '').indexOf(' - ') + 3) ||
            '',
          artist:
            item.SingerName ||
            item.singername ||
            (item.name || '').substring(0, (item.name || '').indexOf(' - ')) ||
            '',
          album: item.AlbumName || (item.albuminfo || '').name || '',
          duration: item.Duration || item.duration,
          source: 'kugou' as const,
        }))
      }
    } catch {
      // ignore
    }
    return []
  }

  if (!neteaseAuthed()) return []
  try {
    const data: any = await ne.playlistTrackAll(playlistId, { limit: 50, offset: 0 })
    if (data.code === 200 && data.songs) {
      return data.songs.map((item: any) => ({
        id: item.id,
        name: item.name || '',
        artist: (item.ar || []).map((a: any) => a.name).join('/'),
        album: item.al?.name || '',
        pic: item.al?.picUrl,
        duration: Math.floor((item.dt || 0) / 1000),
        source: 'netease' as const,
      }))
    }
  } catch {
    // ignore
  }
  return []
}

/** 获取用户收藏/喜欢的歌曲 */
export async function getLikedSongs(source: 'kugou' | 'netease'): Promise<Song[]> {
  if (source === 'kugou') {
    // 酷狗：获取歌单中的"我喜欢"
    const playlists = await getUserPlaylists('kugou')
    for (const item of playlists) {
      if (item.name === '我喜欢' && item.trackCount !== 0) {
        return getPlaylistSongs('kugou', item.id)
      }
    }
    return []
  }

  const user = await getUserInfo('netease')
  if (!user) return []
  try {
    const data: any = await ne.likelist(user.id)
    if (data.code === 200 && data.ids?.length > 0) {
      const ids = data.ids.slice(0, 50)
      const detail: any = await ne.songDetail(ids)
      if (detail.code === 200 && detail.songs) {
        return detail.songs.map((item: any) => ({
          id: item.id,
          name: item.name || '',
          artist: (item.ar || []).map((a: any) => a.name).join('/'),
          album: item.al?.name || '',
          pic: item.al?.picUrl,
          duration: Math.floor((item.dt || 0) / 1000),
          source: 'netease' as const,
        }))
      }
    }
  } catch {
    // ignore
  }
  return []
}
