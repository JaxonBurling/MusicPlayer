/**
 * API 服务层
 * 通过本地 Node 服务（server/index.ts）调用酷狗(Kugou)和网易云(NetEase)音乐接口
 *
 * 前端只与本地服务通信，真实请求由 Node 进程内的 src/kugou、src/wyy 库完成。
 */

const API_BASE =
  ((import.meta as any).env?.VITE_MUSIC_API as string) || 'http://127.0.0.1:3080'

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

/**
 * 调用本地服务的接口
 * @param source 音源
 * @param module 库中的模块名（与 module/ 下的文件名一致）
 * @param query 查询参数
 * @param cookie 登录态 cookie（可选）
 * @returns 模块原始响应体
 */
async function call(
  source: 'kugou' | 'netease',
  module: string,
  query: Record<string, any> = {},
  cookie?: string,
  timeout = 15000,
): Promise<any> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(`${API_BASE}/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        module,
        query: cookie ? { ...query, cookie } : query,
      }),
      signal: controller.signal,
    })
    const text = await res.text()
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return text
    }
  } finally {
    clearTimeout(timer)
  }
}

// ===================== Cookie 管理 =====================

const cookieStore: Record<string, string> = {
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
  return params.source === 'kugou' ? searchKugou(params, cookie) : searchNetease(params, cookie)
}

async function searchKugou(params: SearchParams, cookie: string): Promise<Song[]> {
  const page = params.page || 1
  const pagesize = params.limit || 30
  const data = await call(
    'kugou',
    'search',
    { keywords: params.keywords, page, pagesize, type: 'song' },
    cookie,
  )
  if (data.error_code || !data.data?.lists) return []
  return data.data.lists.map((item: any) => ({
    hash: item.FileHash || item.hash,
    name: item.OriSongName || item.songname || '',
    artist: item.SingerName || item.singername || '',
    album: item.AlbumName || item.album_name || '',
    duration: item.Duration || item.duration,
    pic: item.Image.replace('{size}', '128') || item.pic || '',
    source: 'kugou' as const,
  }))
}

async function searchNetease(params: SearchParams, cookie: string): Promise<Song[]> {
  const limit = params.limit || 30
  const offset = ((params.page || 1) - 1) * limit
  const data = await call(
    'netease',
    'cloudsearch',
    { keywords: params.keywords, limit, offset, type: 1 },
    cookie,
  )
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
  return song.source === 'kugou' ? getKugouUrl(song, cookie) : getNeteaseUrl(song, cookie)
}

async function getKugouUrl(song: Song, cookie: string): Promise<SongUrlResult> {
  if (!song.hash) return { url: '', canPlay: false }
  const data = await call('kugou', 'song_url', { hash: song.hash }, cookie)
  const url = data?.url?.[0] || data?.data?.[0]?.url || data?.data?.url?.[0]
  if (data?.errorcode || data?.error_code || !url) return { url: '', canPlay: false }
  return { url, canPlay: true }
}

async function getNeteaseUrl(song: Song, cookie: string): Promise<SongUrlResult> {
  if (!song.id) return { url: '', canPlay: false }
  const data = await call('netease', 'song_url_v1', { id: song.id, level: 'exhigh' }, cookie)
  if (data.code !== 200 || !data.data?.[0]?.url) return { url: '', canPlay: false }
  return { url: data.data[0].url, canPlay: true }
}

// ===================== 歌词 =====================

export async function getLyric(song: Song): Promise<string> {
  if (song.source === 'netease' && song.id) {
    const data = await call('netease', 'lyric', { id: song.id }, getCookie('netease'))
    if (data.code === 200 && data.lrc?.lyric) return data.lrc.lyric
  }
  return ''
}

// ===================== 登录 =====================

/** 获取二维码 key 和图片（酷狗 key 接口直接返回图片，无需二次请求） */
export async function getQrKey(source: 'kugou' | 'netease'): Promise<{ key: string; image?: string }> {
  if (source === 'kugou') {
    const data = await call('kugou', 'login_qr_key')
    const d = data.data || {}
    return { key: d.qrcode || d.token || d.key || '', image: d.qrcode_img || '' }
  }
  const data = await call('netease', 'login_qr_key')
  return { key: data.data?.unikey || '' }
}

/** 生成二维码（仅网易云需要此步骤；酷狗已在 getQrKey 返回图片） */
export async function createQr(source: 'kugou' | 'netease', key: string): Promise<string> {
  if (source === 'kugou') {
    // 酷狗降级：如果 getQrKey 没返回图片，再调 create 接口
    const data = await call('kugou', 'login_qr_create', { key, qrimg: true })
    const d = data.data || data
    return d?.qrcode_img || d?.qrcode_base64 || d?.base64 || d?.qrcode || d?.image || d?.qrimg || ''
  }
  const data = await call('netease', 'login_qr_create', { key, qrimg: true })
  return data.data?.qrimg || ''
}

export async function checkQr(source: 'kugou' | 'netease', key: string): Promise<{
  status: 'waiting' | 'scanned' | 'expired' | 'success'
  credential: LoginCredential | null
}> {
  if (source === 'kugou') {
    const data = await call('kugou', 'login_qr_check', { key, timestamp: Date.now() })
    const code = data.data?.status ?? data.status ?? 0
    if (code === 4) return { status: 'success', credential: { token: data.data?.token, userId: data.data?.userid } }
    if (code === 2) return { status: 'scanned', credential: null }
    if (code === 0) return { status: 'expired', credential: null }
    return { status: 'waiting', credential: null }
  } else {
    const data = await call('netease', 'login_qr_check', { key, timestamp: Date.now() })
    const code = data.code
    if (code === 803) return { status: 'success', credential: { cookie: data.cookie } }
    if (code === 802) return { status: 'scanned', credential: null }
    if (code === 800) return { status: 'expired', credential: null }
    return { status: 'waiting', credential: null }
  }
}

export async function sendCaptcha(source: 'kugou' | 'netease', phone: string): Promise<boolean> {
  const data =
    source === 'kugou'
      ? await call('kugou', 'captcha_sent', { mobile: phone })
      : await call('netease', 'captcha_sent', { phone })
  return data.code === 200 || data.status === 1 || !!data.data
}

export async function loginByPhone(
  source: 'kugou' | 'netease', phone: string, code: string
): Promise<LoginCredential | null> {
  if (source === 'kugou') {
    const data = await call('kugou', 'login_cellphone', { mobile: phone, code })
    if (data.status === 1 || data.data?.token) return { token: data.data?.token, userId: data.data?.userid }
  } else {
    const data = await call('netease', 'login_cellphone', { phone, captcha: code })
    if (data.code === 200) return { cookie: data.cookie, token: data.token }
  }
  return null
}

// ===================== 用户信息 =====================

export async function getUserInfo(source: 'kugou' | 'netease'): Promise<UserInfo | null> {
  const cookie = getCookie(source)
  if (!cookie) return null
  if (source === 'kugou') {
    const data = await call('kugou', 'user_detail', {}, cookie)
    if (data.status === 1 && data.data) {
      return {
        id: data.data.userid || data.data.userId,
        nickname: data.data.username || data.data.nickname || '',
        avatarUrl: data.data.avatar || data.data.pic || '',
      }
    }
  } else {
    const data = await call('netease', 'user_account', {}, cookie)
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

// ===================== 用户歌单 =====================

/** 获取用户歌单列表 */
export async function getUserPlaylists(source: 'kugou' | 'netease'): Promise<Playlist[]> {
  const cookie = getCookie(source)
  if (!cookie) return []
  if (source === 'kugou') {
    const data = await call('kugou', 'user_playlist', {}, cookie)
    if (data.status === 1 && data.data?.info) {
      return data.data.info.map((item: any) => ({
        id: item.global_collection_id || item.list_create_listid || item.listid,
        name: item.name || item.title || item.specialname || '',
        coverUrl: (item.pic || '').replace('{size}', '400'),
        trackCount: parseInt(item.count) || item.songcount || item.track_count || 0,
        source: 'kugou' as const,
      }))
    }
  } else {
    // 需要用户 uid，从 cookie 或用户信息中获取
    const user = await getUserInfo('netease')
    if (!user) return []
    const data = await call('netease', 'user_playlist', { uid: user.id }, cookie)
    if (data.code === 200 && data.playlist) {
      return data.playlist.map((item: any) => ({
        id: item.id,
        name: item.name,
        coverUrl: item.coverImgUrl || '',
        trackCount: item.trackCount || 0,
        source: 'netease' as const,
      }))
    }
  }
  return []
}

/** 获取歌单中的歌曲 */
export async function getPlaylistSongs(source: 'kugou' | 'netease', playlistId: string | number): Promise<Song[]> {
  const cookie = getCookie(source)
  if (!cookie) return []
  if (source === 'kugou') {
    const data = await call(
      'kugou',
      'playlist_track_all',
      { id: playlistId, page: 1, pagesize: 50 },
      cookie,
    )
    if (data.status === 1 && data.data?.songs) {
      return data.data.songs.map((item: any) => ({
        pic: (item.cover || '').replace('{size}', '128') || (item.pic || '').replace('{size}', '128') || '',
        hash: item.FileHash || item.hash,
        name: item.SongName || item.songname || (item.name || "").slice((item.name || "").indexOf(' - ') + 3) || '',
        artist: item.SingerName || item.singername || (item.name || "").substring(0, (item.name || "").indexOf(' - ')) || '',
        album: item.AlbumName || (item.albuminfo || "").name || '',
        duration: item.Duration || item.duration,
        source: 'kugou' as const,
      }))
    }
  } else {
    const data = await call(
      'netease',
      'playlist_track_all',
      { id: playlistId, limit: 50 },
      cookie,
    )
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
  }
  return []
}

/** 获取用户收藏/喜欢的歌曲 */
export async function getLikedSongs(source: 'kugou' | 'netease'): Promise<Song[]> {
  const cookie = getCookie(source)
  if (!cookie) return []
  if (source === 'kugou') {
    // 酷狗：获取歌单中的"我喜欢"
    const p_l = await getUserPlaylists("kugou")
    for (const item of p_l) {
      if (item.name === "我喜欢" && item.trackCount !== 0) {
        return await getPlaylistSongs("kugou", item.id)
      }
    }
  } else {
    const user = await getUserInfo('netease')
    if (!user) return []
    const data = await call('netease', 'likelist', { uid: user.id }, cookie)
    if (data.code === 200 && data.ids?.length > 0) {
      // 批量获取歌曲详情（最多 50 首）
      const ids = data.ids.slice(0, 50).join(',')
      const detailData = await call('netease', 'song_detail', { ids }, cookie)
      if (detailData.code === 200 && detailData.songs) {
        return detailData.songs.map((item: any) => ({
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
  }
  return []
}
