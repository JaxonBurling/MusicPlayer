/**
 * API 服务层
 * 封装酷狗(Kugou)和网易云(NetEase)音乐 API 的调用
 */

// API 服务器地址，可根据实际部署修改
const KUGOU_BASE = 'https://kugou.ovps.top'
const NETEASE_BASE = 'https://wyy.ovps.top'

/** 歌曲数据类型 */
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

/** 搜索参数 */
export interface SearchParams {
  keywords: string
  page?: number
  limit?: number
  source: 'kugou' | 'netease'
}

/** 播放 URL 响应 */
export interface SongUrlResult {
  url: string
  canPlay: boolean
}

/** 用户信息 */
export interface UserInfo {
  id: string | number
  nickname: string
  avatarUrl: string
  vip?: boolean
}

/** 登录凭证 */
export interface LoginCredential {
  token?: string
  cookie?: string
  userId?: string | number
}

/**
 * 通用 fetch 封装
 */
async function request(url: string, cookie?: string, timeout = 8000): Promise<any> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  // 拼接 cookie 参数
  let finalUrl = url
  if (cookie) {
    finalUrl += (url.includes('?') ? '&' : '?') + 'cookie=' + encodeURIComponent(cookie)
  }

  try {
    const res = await fetch(finalUrl, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** 获取当前音源的 cookie */
let cookieStore: Record<string, string> = {
  kugou: localStorage.getItem('kugou_cookie') || '',
  netease: localStorage.getItem('netease_cookie') || '',
}

export function getCookie(source: 'kugou' | 'netease'): string {
  return cookieStore[source]
}

export function setCookie(source: 'kugou' | 'netease', cookie: string) {
  cookieStore[source] = cookie
  localStorage.setItem(`${source}_cookie`, cookie)
}

export function clearCookie(source: 'kugou' | 'netease') {
  cookieStore[source] = ''
  localStorage.removeItem(`${source}_cookie`)
}

// ===================== 搜索 =====================

export async function searchSongs(params: SearchParams): Promise<Song[]> {
  const cookie = getCookie(params.source)
  if (params.source === 'kugou') {
    return searchKugou(params, cookie)
  } else {
    return searchNetease(params, cookie)
  }
}

async function searchKugou(params: SearchParams, cookie: string): Promise<Song[]> {
  const page = params.page || 1
  const pagesize = params.limit || 30
  const url = `${KUGOU_BASE}/search?keywords=${encodeURIComponent(params.keywords)}&page=${page}&pagesize=${pagesize}`
  const data = await request(url, cookie)
  if (data.error_code || !data.data?.lists) return []
  return data.data.lists.map((item: any) => ({
    hash: item.FileHash || item.hash,
    name: item.SongName || item.songname || '',
    artist: item.SingerName || item.singername || '',
    album: item.AlbumName || item.album_name || '',
    duration: item.Duration || item.duration,
    source: 'kugou' as const,
  }))
}

async function searchNetease(params: SearchParams, cookie: string): Promise<Song[]> {
  const limit = params.limit || 30
  const offset = ((params.page || 1) - 1) * limit
  const url = `${NETEASE_BASE}/cloudsearch?keywords=${encodeURIComponent(params.keywords)}&limit=${limit}&offset=${offset}&type=1`
  const data = await request(url, cookie)
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
}

// ===================== 歌曲 URL =====================

export async function getSongUrl(song: Song): Promise<SongUrlResult> {
  const cookie = getCookie(song.source)
  if (song.source === 'kugou') {
    return getKugouUrl(song, cookie)
  } else {
    return getNeteaseUrl(song, cookie)
  }
}

async function getKugouUrl(song: Song, cookie: string): Promise<SongUrlResult> {
  if (!song.hash) return { url: '', canPlay: false }
  const url = `${KUGOU_BASE}/song/url?hash=${song.hash}`
  const data = await request(url, cookie)
  if (data.error_code || !data.data?.url) {
    return { url: '', canPlay: false }
  }
  return { url: data.data.url, canPlay: true }
}

async function getNeteaseUrl(song: Song, cookie: string): Promise<SongUrlResult> {
  if (!song.id) return { url: '', canPlay: false }
  const url = `${NETEASE_BASE}/song/url/v1?id=${song.id}&level=exhigh`
  const data = await request(url, cookie)
  if (data.code !== 200 || !data.data?.[0]?.url) {
    return { url: '', canPlay: false }
  }
  return { url: data.data[0].url, canPlay: true }
}

// ===================== 歌词 =====================

export async function getLyric(song: Song): Promise<string> {
  if (song.source === 'netease' && song.id) {
    const url = `${NETEASE_BASE}/lyric?id=${song.id}`
    const data = await request(url, getCookie('netease'))
    if (data.code === 200 && data.lrc?.lyric) return data.lrc.lyric
  }
  return ''
}

// ===================== 登录 =====================

/** 获取二维码 key */
export async function getQrKey(source: 'kugou' | 'netease'): Promise<string> {
  const base = source === 'kugou' ? KUGOU_BASE : NETEASE_BASE
  const data = await request(`${base}/login/qr/key`)
  if (source === 'kugou') return data.data?.token || data.data?.key || ''
  return data.data?.unikey || ''
}

/** 生成二维码 (返回 base64 图片) */
export async function createQr(source: 'kugou' | 'netease', key: string): Promise<string> {
  const base = source === 'kugou' ? KUGOU_BASE : NETEASE_BASE
  const data = await request(`${base}/login/qr/create?key=${key}&qrimg=true`)
  if (source === 'kugou') return data.data?.qrcode_base64 || data.data?.image || ''
  return data.data?.qrimg || ''
}

/** 检测二维码扫码状态 */
export async function checkQr(source: 'kugou' | 'netease', key: string): Promise<{
  status: 'waiting' | 'scanned' | 'expired' | 'success'
  credential: LoginCredential | null
}> {
  const base = source === 'kugou' ? KUGOU_BASE : NETEASE_BASE
  const data = await request(`${base}/login/qr/check?key=${key}&timestamp=${Date.now()}`)

  if (source === 'kugou') {
    const code = data.data?.status || data.status || 0
    if (code === 4) {
      return { status: 'success', credential: { token: data.data?.token, userId: data.data?.userid } }
    } else if (code === 2) {
      return { status: 'scanned', credential: null }
    } else if (code === 0) {
      return { status: 'expired', credential: null }
    }
    return { status: 'waiting', credential: null }
  } else {
    const code = data.code
    if (code === 803) {
      return { status: 'success', credential: { cookie: data.cookie } }
    } else if (code === 802) {
      return { status: 'scanned', credential: null }
    } else if (code === 800) {
      return { status: 'expired', credential: null }
    }
    return { status: 'waiting', credential: null }
  }
}

/** 发送验证码 */
export async function sendCaptcha(source: 'kugou' | 'netease', phone: string): Promise<boolean> {
  const base = source === 'kugou' ? KUGOU_BASE : NETEASE_BASE
  const param = source === 'kugou' ? 'mobile' : 'phone'
  const data = await request(`${base}/captcha/sent?${param}=${phone}`)
  return data.code === 200 || data.status === 1 || data.data
}

/** 手机验证码登录 */
export async function loginByPhone(
  source: 'kugou' | 'netease',
  phone: string,
  code: string
): Promise<LoginCredential | null> {
  const base = source === 'kugou' ? KUGOU_BASE : NETEASE_BASE
  const param = source === 'kugou' ? 'mobile' : 'phone'
  const data = await request(`${base}/login/cellphone?${param}=${phone}&code=${encodeURIComponent(code)}`)

  if (source === 'kugou') {
    if (data.status === 1 || data.data?.token) {
      return { token: data.data?.token, userId: data.data?.userid }
    }
  } else {
    if (data.code === 200) {
      return { cookie: data.cookie, token: data.token }
    }
  }
  return null
}

// ===================== 用户信息 =====================

/** 获取用户信息 */
export async function getUserInfo(source: 'kugou' | 'netease'): Promise<UserInfo | null> {
  const cookie = getCookie(source)
  if (!cookie) return null

  if (source === 'kugou') {
    const data = await request(`${KUGOU_BASE}/user/detail`, cookie)
    if (data.status === 1 && data.data) {
      return {
        id: data.data.userid || data.data.userId,
        nickname: data.data.username || data.data.nickname || '',
        avatarUrl: data.data.avatar || data.data.headimg || '',
      }
    }
  } else {
    const data = await request(`${NETEASE_BASE}/user/account`, cookie)
    if (data.code === 200 && data.profile) {
      return {
        id: data.profile.userId,
        nickname: data.profile.nickname,
        avatarUrl: data.profile.avatarUrl,
        vip: data.profile.vipType > 0,
      }
    }
  }
  return null
}
