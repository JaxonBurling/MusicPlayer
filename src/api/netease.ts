/**
 * 网易云音乐官方 API 直连客户端（单文件 SDK）
 *
 * 不依赖本项目的 Express 服务，直接从进程内请求网易云官方接口。
 * 运行时只依赖 Node.js 内置模块：`node:crypto`、`node:zlib` 以及全局 `fetch`。
 * 要求 Node.js >= 18（推荐 20+）。
 *
 * 典型用法：
 *
 * ```ts
 * import { NeteaseClient } from './sdk/netease'
 *
 * const api = new NeteaseClient()
 * const search = await api.cloudSearch('晴天')
 * const song = search.result?.songs?.[0]
 * const detail = await api.songDetail(song!.id)
 * const url = await api.songUrl(song!.id, { level: 'exhigh' })
 * ```
 *
 * 需要登录态时：
 *
 * ```ts
 * const { unikey } = await api.loginQrKey()
 * const { data } = await api.loginQrCreate(unikey, { renderQr: renderQrCode })
 * // 用户扫码后轮询：
 * const status = await api.loginQrCheck(unikey) // 800 过期 / 801 待扫 / 802 待确认 / 803 成功
 * console.log(api.getCookie())
 * ```
 *
 * 说明：
 * - 默认使用 `eapi` 加密（与官方 App 一致），个别接口按官方实现切换 `weapi` / `xeapi`。
 * - `songUrl` 等音质接口使用 `xeapi`，客户端会自动拉取并缓存安全公钥。
 * - 未登录时会自动使用 `registerAnonymous()` 获取的匿名 token（如果设置过）。
 * - 所有响应中的 `code` 都会转换为 number；HTTP 层错误会抛出 `NeteaseError`。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AES,
  Base64,
  CBC,
  CipherParams,
  ECB,
  Hex,
  HmacSHA256,
  MD5,
  Pkcs7,
  Utf8,
  WordArray,
} from 'crypto-es'
import forge from 'node-forge'
import { ungzip } from 'pako'
import { Buffer } from 'buffer'
import { x25519 } from '@noble/curves/ed25519.js'

// ---------------------------------------------------------------------------
// 常量（与官方客户端 / 本项目 util/config.json 保持一致）
// ---------------------------------------------------------------------------

const DOMAIN = 'https://music.163.com'
const API_DOMAIN = 'https://interface.music.163.com'
const XEAPI_DOMAIN = 'https://interface3.music.163.com'
const CLIENT_LOG_DOMAIN = 'https://clientlog.music.163.com'

const WEAPI_IV = '0102030405060708'
const WEAPI_PRESET_KEY = '0CoJUm6Qyw8W8jud'
const WEAPI_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`

const EAPI_KEY_STRING = 'e82ckenh8dichen8'
const EAPI_KEY = Buffer.from(EAPI_KEY_STRING, 'utf8')
const EAPI_SEPARATOR = '-36cd479b6b5-'

const XEAPI_STATIC_KEY = Buffer.from(
  'ab1d5a430f6bb04a3f01e81ddd72bd916d5ce591248ac128714806d7f8fb1b84',
  'hex',
)
const XEAPI_SIGN_KEY =
  'mUHCwVNWJbunMqAHf5MImuirT6plvs6VSFW62MGHstFQxhBGdEoIhLItH3djc4+FB/OKty3+lL2rGeoFBpVe5g=='
const WEAPI_RSA_KEY = forge.pki.publicKeyFromPem(
  WEAPI_PUBLIC_KEY,
) as forge.pki.rsa.PublicKey
const WEAPI_RSA_KEY_SIZE = Math.ceil(WEAPI_RSA_KEY.n.bitLength() / 8)

const WEAPI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
const EAPI_UA = 'NeteaseMusic 9.0.90/5038 (iPhone; iOS 16.2; zh_CN)'
const XEAPI_UA =
  'NeteaseMusic/9.1.65.240927161425(9001065);Dalvik/2.1.0 (Linux; U; Android 14; 23013RK75C Build/UKQ1.230804.001)'

const RESOURCE_TYPE_MAP: Record<number, string> = {
  0: 'R_SO_4_',
  1: 'R_MV_5_',
  2: 'A_PL_0_',
  3: 'R_AL_3_',
  4: 'A_DJ_1_',
  5: 'R_VI_62_',
  6: 'A_EV_2_',
}

const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const HEX_UPPER = '0123456789ABCDEF'

const PROFILE_PRESETS = {
  pc: {
    os: 'pc',
    appver: '3.1.17.204416',
    osver: 'Microsoft-Windows-10-Professional-build-19045-64bit',
    channel: 'netease',
  },
  linux: {
    os: 'linux',
    appver: '1.2.1.0428',
    osver: 'Deepin 20.9',
    channel: 'netease',
  },
  android: {
    os: 'android',
    appver: '8.20.20.231215173437',
    osver: '14',
    channel: 'xiaomi',
  },
  iphone: {
    os: 'iPhone OS',
    appver: '9.0.90',
    osver: '16.2',
    channel: 'distribution',
  },
  osx: {
    os: 'osx',
    appver: '3.1.10.5100',
    osver: '15.5',
    channel: 'netease',
  },
} as const

// ---------------------------------------------------------------------------
// 公共类型
// ---------------------------------------------------------------------------

export type CryptoMode = 'weapi' | 'eapi' | 'api' | 'xeapi'

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface ClientProfile {
  os: string
  appver: string
  osver: string
  channel: string
  versioncode?: string
  mobilename?: string
  resolution?: string
}

export interface RequestOptions {
  /** 覆盖本次请求的加密方式 */
  crypto?: CryptoMode
  /** 覆盖本次请求的 cookie，例如临时使用另一个账号 */
  cookie?: string | Record<string, string>
  /** 覆盖接口域名（一般无需设置） */
  domain?: string
  /** 写入 X-Real-IP / X-Forwarded-For */
  realIP?: string
  /** 请求超时，毫秒 */
  timeout?: number
  /** 额外请求头 */
  headers?: Record<string, string>
}

export interface NeteaseClientConfig extends RequestOptions {
  /** 匿名 token（MUSIC_A），也可以先调用 registerAnonymous() 自动获取 */
  anonymousToken?: string
  /** 固定设备 ID，不传则自动生成 */
  deviceId?: string
  /** 设备信息，可只覆盖部分字段 */
  profile?: Partial<ClientProfile>
  /** 覆盖 User-Agent */
  ua?: string
  /** 自定义 fetch，可用于接入代理（例如 undici 的 ProxyAgent） */
  fetch?: FetchLike
  apiDomain?: string
  xeapiDomain?: string
  webDomain?: string
}

export interface NeteaseResponse {
  code: number
  [key: string]: any
}

export interface PageOptions {
  limit?: number
  offset?: number
}

export interface SearchOptions extends PageOptions, RequestOptions {
  /** 1 单曲 / 10 专辑 / 100 歌手 / 1000 歌单 / 1002 用户 / 1004 MV / 1006 歌词 / 1009 电台 / 1014 视频 */
  type?: number
}

export type SongLevel =
  | 'standard'
  | 'higher'
  | 'exhigh'
  | 'lossless'
  | 'hires'
  | 'jyeffect'
  | 'sky'
  | 'jymaster'

export interface SongUrlOptions extends RequestOptions {
  level?: SongLevel
}

export interface SongUrl {
  id: number
  url: string | null
  br: number
  size: number
  md5?: string
  code: number
  expi?: number
  type?: string
  gain?: number
  peak?: number
  fee?: number
  payed?: number
  flag?: number
  canExtend?: boolean
  freeTrialInfo?: unknown
  level?: string
  encodeType?: string
  [key: string]: any
}

export interface SongUrlResponse extends NeteaseResponse {
  data: SongUrl[]
}

export interface Artist {
  id: number
  name: string
  [key: string]: any
}

export interface Album {
  id: number
  name: string
  picUrl?: string
  [key: string]: any
}

export interface Song {
  id: number
  name: string
  ar?: Artist[]
  artists?: Artist[]
  al?: Album
  album?: Album
  dt?: number
  duration?: number
  [key: string]: any
}

export interface SongDetailResponse extends NeteaseResponse {
  songs: Song[]
  privileges?: unknown[]
}

export interface SearchResponse extends NeteaseResponse {
  result?: {
    songs?: Song[]
    songCount?: number
    albums?: unknown[]
    artists?: unknown[]
    playlists?: unknown[]
    [key: string]: any
  }
}

export interface LyricResponse extends NeteaseResponse {
  lrc?: { version: number; lyric: string }
  tlyric?: { version: number; lyric: string }
  romalrc?: { version: number; lyric: string }
  yrc?: { version: number; lyric: string }
  ytlrc?: { version: number; lyric: string }
  yromalrc?: { version: number; lyric: string }
}

export interface PlaylistDetailResponse extends NeteaseResponse {
  playlist?: {
    id: number
    name: string
    tracks?: Song[]
    trackIds?: Array<{ id: number; v?: number }>
    [key: string]: any
  }
}

export interface LoginQrKeyResponse extends NeteaseResponse {
  unikey: string
}

export interface LoginQrCreateResponse extends NeteaseResponse {
  data: {
    qrurl: string
    qrimg: string
  }
}

export interface CellphoneLoginOptions extends RequestOptions {
  phone: string | number
  countrycode?: string | number
  password?: string
  md5Password?: string
  captcha?: string | number
}

export interface EmailLoginOptions extends RequestOptions {
  email: string
  password?: string
  md5Password?: string
  rememberLogin?: boolean
}

export interface CommentOptions extends RequestOptions {
  /** 0 歌曲 / 1 MV / 2 歌单 / 3 专辑 / 4 电台 / 5 视频 / 6 动态 */
  type?: number
  id?: string | number
  threadId?: string
}

export interface CommentAction {
  /** 1 发表 / 0 删除 / 2 回复 */
  t: 0 | 1 | 2
  content?: string
  commentId?: string | number
}

export interface PlaylistCreateOptions extends RequestOptions {
  privacy?: 0 | 10
  type?: 'NORMAL' | 'VIDEO' | 'SHARED'
}

export interface ScrobbleOptions extends RequestOptions {
  sourceid: string | number
  time: number
}

// ---------------------------------------------------------------------------
// 通用工具
// ---------------------------------------------------------------------------

function randomString(length: number, chars = BASE62): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

/** 安全随机字节（浏览器 / Node 通用） */
function randomBytes(size: number): Buffer {
  const bytes = new Uint8Array(size)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < size; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Buffer.from(bytes)
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString('hex')
}

function randomDigits(length: number): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10)
  }
  return result
}

function generateDeviceId(): string {
  let result = ''
  for (let i = 0; i < 52; i++) {
    result += HEX_UPPER[Math.floor(Math.random() * HEX_UPPER.length)]
  }
  return result
}

function md5(text: string): string {
  return MD5(text).toString(Hex)
}

function md5Base64(text: string): string {
  return MD5(text).toString(Base64)
}

/** 解析 cookie 字符串为对象（保留值中的 '='） */
export function parseCookieString(cookie: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!cookie) return result
  for (const part of cookie.split(';')) {
    const index = part.indexOf('=')
    if (index > 0) {
      result[part.slice(0, index).trim()] = part.slice(index + 1).trim()
    }
  }
  return result
}

function serializeCookie(
  cookie: Record<string, string | number | undefined>,
): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(cookie)) {
    if (value === undefined) continue
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
  }
  return parts.join('; ')
}

/** 从 fetch 响应中取出所有 Set-Cookie（兼容缺少 getSetCookie 的 Node 18） */
function getSetCookies(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[]
  }
  if (typeof withGetSetCookie.getSetCookie === 'function') {
    return withGetSetCookie.getSetCookie()
  }
  const raw = headers.get('set-cookie')
  if (!raw) return []
  // Expires 里可能包含逗号，只在 "key=" 前拆分
  return raw.split(/,\s*(?=[^;,]+=)/g)
}

/** 只保留 Set-Cookie 的第一段 key=value */
function parseSetCookie(setCookie: string): [string, string] | null {
  const first = setCookie.split(';', 1)[0]
  const index = first.indexOf('=')
  if (index <= 0) return null
  return [first.slice(0, index).trim(), first.slice(index + 1).trim()]
}

function toForm(data: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue
    params.append(key, typeof value === 'string' ? value : String(value))
  }
  return params
}

function normalizeIds(ids: string | number | Array<string | number>): string[] {
  const list = Array.isArray(ids) ? ids : String(ids).split(/\s*,\s*/)
  return list
    .map((id) => String(id).trim())
    .filter(Boolean)
    .map((id) => {
      if (!/^-?\d+$/.test(id)) {
        throw new TypeError(`非法的 id: ${id}`)
      }
      return id
    })
}

function idJson(ids: string[]): string {
  return `[${ids.map((id) => `{"id":${id}}`).join(',')}]`
}

// ---------------------------------------------------------------------------
// 加密实现（Node 内置 crypto，替换 crypto-js / node-forge）
// ---------------------------------------------------------------------------

/** WordArray → Buffer */
function toBuffer(wordArray: WordArray): Buffer {
  const { words, sigBytes } = wordArray
  const out = Buffer.alloc(sigBytes)
  for (let i = 0; i < sigBytes; i++) {
    out[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  return out
}

/** HMAC-SHA256 → Base64 */
function hmacSha256Base64(message: Uint8Array, key: Uint8Array): string {
  return HmacSHA256(new WordArray(message), new WordArray(key)).toString(
    Base64,
  )
}

function aesCbcEncryptBase64(text: string, key: string, iv: string): string {
  const encrypted = AES.encrypt(Utf8.parse(text), Utf8.parse(key), {
    iv: Utf8.parse(iv),
    mode: CBC,
    padding: Pkcs7,
  })
  return encrypted.ciphertext!.toString(Base64)
}

function aesEcbEncrypt(key: Buffer, plaintext: Buffer): Buffer {
  const encrypted = AES.encrypt(
    new WordArray(plaintext),
    new WordArray(key),
    { mode: ECB, padding: Pkcs7 },
  )
  return Buffer.from(encrypted.ciphertext!.toString(Hex), 'hex')
}

function aesEcbDecrypt(key: Buffer, ciphertext: Buffer): Buffer {
  const decrypted = AES.decrypt(
    new CipherParams({ ciphertext: new WordArray(ciphertext) }),
    new WordArray(key),
    { mode: ECB, padding: Pkcs7 },
  )
  return toBuffer(decrypted)
}

function aesEcbEncryptHex(text: string, key: string): string {
  return aesEcbEncrypt(Buffer.from(key, 'utf8'), Buffer.from(text, 'utf8'))
    .toString('hex')
    .toUpperCase()
}

/** weapi 用的「无填充」RSA */
function rsaEncryptNoPadding(text: string): string {
  const data = Buffer.from(text, 'utf8')
  if (data.length > WEAPI_RSA_KEY_SIZE) {
    throw new Error('weapi secret key is too long for RSA key size')
  }
  const padded = Buffer.alloc(WEAPI_RSA_KEY_SIZE)
  data.copy(padded, WEAPI_RSA_KEY_SIZE - data.length)
  const message = new forge.jsbn.BigInteger(padded.toString('hex'), 16)
  const encrypted = message.modPow(WEAPI_RSA_KEY.e, WEAPI_RSA_KEY.n)
  return encrypted.toString(16).padStart(WEAPI_RSA_KEY_SIZE * 2, '0')
}

function weapiEncrypt(data: Record<string, unknown>): {
  params: string
  encSecKey: string
} {
  const text = JSON.stringify(data)
  const secretKey = randomString(16)
  return {
    params: aesCbcEncryptBase64(
      aesCbcEncryptBase64(text, WEAPI_PRESET_KEY, WEAPI_IV),
      secretKey,
      WEAPI_IV,
    ),
    encSecKey: rsaEncryptNoPadding(secretKey.split('').reverse().join('')),
  }
}

function eapiEncrypt(uri: string, data: Record<string, unknown>): string {
  const text = JSON.stringify(data)
  const digest = md5(`nobody${uri}use${text}md5forencrypt`)
  const raw = `${uri}${EAPI_SEPARATOR}${text}${EAPI_SEPARATOR}${digest}`
  return aesEcbEncryptHex(raw, EAPI_KEY_STRING)
}

const XEAPI_SIGN_KEY_HMAC = Buffer.from(XEAPI_SIGN_KEY, 'utf8')

function xeapiSign(timestamp: string | number, nonce: string): string {
  return hmacSha256Base64(
    Buffer.from(String(timestamp) + nonce, 'utf8'),
    XEAPI_SIGN_KEY_HMAC,
  )
}

function deriveX25519AesKey(
  sharedSecret: Buffer,
  ephemeralPublicKey: Buffer,
): Buffer {
  const prk = Buffer.from(
    hmacSha256Base64(
      sharedSecret.length ? sharedSecret : Buffer.alloc(32),
      Buffer.alloc(32),
    ),
    'base64',
  )
  const derived = hmacSha256Base64(
    Buffer.concat([ephemeralPublicKey, Buffer.from([1])]),
    prk,
  )
  return Buffer.from(derived, 'base64').subarray(0, 16)
}

function xeapiMidTransform(ciphertext: Buffer): Buffer {
  const pad = randomBytes(16)
  const xored = Buffer.alloc(ciphertext.length)
  for (let i = 0; i < ciphertext.length; i++) {
    xored[i] = ciphertext[i] ^ pad[i & 0x0f]
  }
  const base64 = Buffer.from(xored.toString('base64'))
  const rotation = base64.length ? (pad[0] & 0x0f) % base64.length : 0
  return Buffer.concat([
    pad,
    base64.subarray(rotation),
    base64.subarray(0, rotation),
  ])
}

async function xeapiEncryptS(
  dynamicKey: Buffer,
  keyState: XeapiKeyState,
  os: string,
): Promise<Buffer> {
  const peerRaw = Buffer.from(keyState.publicKey, 'base64')
  const secretKey = x25519.utils.randomSecretKey()
  const publicKey = x25519.getPublicKey(secretKey)
  const sharedSecret = Buffer.from(x25519.getSharedSecret(secretKey, peerRaw))
  const aesKey = deriveX25519AesKey(sharedSecret, Buffer.from(publicKey))
  const iv = randomBytes(12)
  const plaintext = Buffer.from(
    `${dynamicKey.toString('base64')}|${os}|${keyState.sk ?? ''}`,
    'utf8',
  )
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    aesKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )
  const encrypted = Buffer.from(
    await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      plaintext,
    ),
  )
  return Buffer.concat([Buffer.from(publicKey), iv, encrypted])
}

interface XeapiKeyState {
  version: string
  publicKey: string
  sk?: string
}

interface XeapiSession {
  id: string
  key: string
}

function buildXeapiPlaintext(
  uri: string,
  data: Record<string, unknown>,
): string {
  const fields: Record<string, string> = {}
  const url = new URL(uri, API_DOMAIN)
  if (url.search) fields.queryString = url.search.slice(1)

  const bodyData: Record<string, unknown> = { ...data }
  delete bodyData.e_r
  fields.body = Buffer.from(toForm(bodyData).toString(), 'utf8').toString(
    'base64',
  )

  fields.queryString = fields.queryString
    ? `${fields.queryString}&e_r=true`
    : 'e_r=true'
  return JSON.stringify(fields)
}

async function xeapiEncrypt(
  uri: string,
  data: Record<string, unknown>,
  keyState: XeapiKeyState,
  session: XeapiSession,
  os = 'android',
): Promise<Record<string, string>> {
  const activeSessionKey = session.key
    ? Buffer.from(String(session.key), 'utf8')
    : null
  const dynamicKey = activeSessionKey ?? randomBytes(16)
  const plaintext = Buffer.from(buildXeapiPlaintext(uri, data), 'utf8')

  const b = aesEcbEncrypt(
    dynamicKey,
    xeapiMidTransform(aesEcbEncrypt(XEAPI_STATIC_KEY, plaintext)),
  )
  const s = await xeapiEncryptS(dynamicKey, keyState, os)
  const r = aesEcbEncrypt(
    XEAPI_STATIC_KEY,
    Buffer.from(
      `${keyState.version}|${activeSessionKey ? session.id : ''}`,
      'utf8',
    ),
  )

  return {
    B: b.toString('base64'),
    S: s.toString('base64'),
    R: r.toString('base64'),
  }
}

function xeapiDecryptResponse(body: Buffer): any {
  const decrypted = aesEcbDecrypt(EAPI_KEY, body)
  const plaintext =
    decrypted.length >= 2 && decrypted[0] === 0x1f && decrypted[1] === 0x8b
      ? Buffer.from(ungzip(decrypted))
      : decrypted
  return JSON.parse(plaintext.toString('utf8'))
}

// ---------------------------------------------------------------------------
// 错误
// ---------------------------------------------------------------------------

export class NeteaseError extends Error {
  status: number
  body?: unknown
  code?: number

  constructor(message: string, status = 0, body?: unknown) {
    super(message)
    this.name = 'NeteaseError'
    this.status = status
    this.body = body
    if (body && typeof body === 'object' && 'code' in body) {
      this.code = Number((body as { code: unknown }).code)
    }
  }
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class NeteaseClient {
  private readonly fetchImpl: FetchLike
  private readonly apiDomain: string
  private readonly xeapiDomain: string
  private readonly webDomain: string
  private readonly defaultCrypto: CryptoMode
  private readonly defaultTimeout?: number
  private readonly ua?: string
  private readonly realIP?: string
  private readonly baseHeaders: Record<string, string>
  private readonly profile: ClientProfile

  private jar: Record<string, string> = {}
  private anonymousToken = ''
  private readonly deviceId: string
  private readonly nuid: string
  private readonly nnid: string
  private readonly wnmcid: string

  private xeapiKey: XeapiKeyState | null = null
  private xeapiKeyPromise: Promise<XeapiKeyState> | null = null
  private xeapiSession: XeapiSession = { id: '', key: '' }

  constructor(config: NeteaseClientConfig = {}) {
    const preset = PROFILE_PRESETS.pc
    this.profile = {
      ...preset,
      ...config.profile,
    }

    this.jar =
      typeof config.cookie === 'string'
        ? parseCookieString(config.cookie)
        : { ...(config.cookie ?? {}) }

    this.deviceId = config.deviceId ?? this.jar.deviceId ?? generateDeviceId()
    this.anonymousToken = config.anonymousToken ?? this.jar.MUSIC_A ?? ''
    this.nuid = this.jar._ntes_nuid ?? randomHex(32)
    this.nnid = this.jar._ntes_nnid ?? `${this.nuid},${Date.now().toString()}`
    this.wnmcid = `${randomString(6)}.${Date.now().toString()}.01.0`

    this.apiDomain = config.apiDomain ?? API_DOMAIN
    this.xeapiDomain = config.xeapiDomain ?? XEAPI_DOMAIN
    this.webDomain = config.webDomain ?? DOMAIN
    this.defaultCrypto = config.crypto ?? 'eapi'
    this.defaultTimeout = config.timeout
    this.ua = config.ua
    this.realIP = config.realIP
    this.baseHeaders = { ...(config.headers ?? {}) }

    const fetchImpl = config.fetch ?? globalThis.fetch
    if (typeof fetchImpl !== 'function') {
      throw new Error(
        '当前运行时没有 fetch，请升级到 Node.js 18+ 或传入 config.fetch',
      )
    }
    this.fetchImpl = (input, init) => fetchImpl(input, init)
  }

  // -------------------------------------------------------------------------
  // Cookie / 设备
  // -------------------------------------------------------------------------

  /** 返回可直接复用的完整 cookie（含设备信息与匿名 token） */
  getCookie(): string {
    return serializeCookie(this.buildCookie(''))
  }

  getCookieObject(): Record<string, string> {
    return this.buildCookie('')
  }

  setCookie(cookie: string | Record<string, string>): this {
    const next = typeof cookie === 'string' ? parseCookieString(cookie) : cookie
    this.jar = { ...this.jar, ...next }
    if (next.MUSIC_A) this.anonymousToken = next.MUSIC_A
    return this
  }

  clearCookie(): this {
    this.jar = {}
    this.anonymousToken = ''
    return this
  }

  getDeviceId(): string {
    return this.jar.deviceId || this.deviceId
  }

  private applySetCookies(setCookies: string[]): void {
    for (const raw of setCookies) {
      const pair = parseSetCookie(raw)
      if (!pair) continue
      const [key, value] = pair
      const expired = /max-age=0|expires=thu, 01 jan 1970/i.test(raw)
      if (!value || expired) {
        delete this.jar[key]
      } else {
        this.jar[key] = value
      }
    }
  }

  private effectiveJar(override?: string | Record<string, string>) {
    if (!override) return this.jar
    const extra =
      typeof override === 'string' ? parseCookieString(override) : override
    return { ...this.jar, ...extra }
  }

  /** 组装完整 cookie（补全设备信息与匿名 token） */
  private buildCookie(
    uri: string,
    override?: string | Record<string, string>,
  ): Record<string, string> {
    const jar = this.effectiveJar(override)
    const cookie: Record<string, string> = {
      ...jar,
      __remember_me: 'true',
      ntes_kaola_ad: '1',
      _ntes_nuid: jar._ntes_nuid || this.nuid,
      _ntes_nnid: jar._ntes_nnid || this.nnid,
      WNMCID: jar.WNMCID || this.wnmcid,
      WEVNSM: jar.WEVNSM || '1.0.0',
      osver: jar.osver || this.profile.osver,
      deviceId: jar.deviceId || this.deviceId,
      os: jar.os || this.profile.os,
      channel: jar.channel || this.profile.channel,
      appver: jar.appver || this.profile.appver,
    }
    if (!cookie.MUSIC_U && !cookie.MUSIC_A && this.anonymousToken) {
      cookie.MUSIC_A = this.anonymousToken
    }
    if (uri.indexOf('login') === -1) {
      cookie.NMTID = jar.NMTID || randomHex(16)
    }
    return cookie
  }

  private buildEapiHeader(cookie: Record<string, string>) {
    const header: Record<string, string> = {
      osver: cookie.osver,
      deviceId: cookie.deviceId,
      os: cookie.os,
      appver: cookie.appver,
      versioncode: cookie.versioncode || '140',
      mobilename: cookie.mobilename || '',
      buildver: cookie.buildver || Math.floor(Date.now() / 1000).toString(),
      resolution: cookie.resolution || '1920x1080',
      __csrf: cookie.__csrf || '',
      channel: cookie.channel,
      requestId: `${Date.now()}_${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(4, '0')}`,
    }
    if (cookie.MUSIC_U) header.MUSIC_U = cookie.MUSIC_U
    if (cookie.MUSIC_A) header.MUSIC_A = cookie.MUSIC_A
    return header
  }

  // -------------------------------------------------------------------------
  // 底层请求
  // -------------------------------------------------------------------------

  async request<T = NeteaseResponse>(
    uri: string,
    data: Record<string, unknown> = {},
    options: RequestOptions = {},
  ): Promise<T> {
    const cryptoMode = options.crypto ?? this.defaultCrypto
    if (cryptoMode === 'xeapi') {
      return this.xeapiRequest<T>(uri, data, options)
    }

    const cookie = this.buildCookie(uri, options.cookie)
    const timeout = options.timeout ?? this.defaultTimeout
    const headers: Record<string, string> = {
      Accept: '*/*',
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      ...this.baseHeaders,
      ...(options.headers ?? {}),
    }
    const ip = options.realIP ?? this.realIP
    if (ip) {
      headers['X-Real-IP'] = ip
      headers['X-Forwarded-For'] = ip
    }

    const requestData: Record<string, unknown> = { ...data }
    requestData.e_r = false

    let url: string
    let body: string

    switch (cryptoMode) {
      case 'weapi': {
        headers.Referer = options.domain || this.webDomain
        headers['User-Agent'] = this.ua || WEAPI_UA
        headers.Cookie = serializeCookie(cookie)
        const encrypted = weapiEncrypt({
          ...requestData,
          csrf_token: cookie.__csrf || '',
        })
        url = `${options.domain || this.webDomain}/weapi/${uri.slice(5)}`
        body = toForm(encrypted).toString()
        break
      }
      case 'api': {
        const header = this.buildEapiHeader(cookie)
        headers.Cookie = serializeCookie(header)
        headers['User-Agent'] = this.ua || EAPI_UA
        url = `${options.domain || this.apiDomain}${uri}`
        body = toForm(requestData).toString()
        break
      }
      case 'eapi':
      default: {
        const header = this.buildEapiHeader(cookie)
        headers.Cookie = serializeCookie(header)
        headers['User-Agent'] = this.ua || EAPI_UA
        requestData.header = header
        url = `${options.domain || this.apiDomain}/eapi/${uri.slice(5)}`
        body = toForm({ params: eapiEncrypt(uri, requestData) }).toString()
        break
      }
    }

    const response = await this.fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers,
        body,
      },
      timeout,
    )

    this.applySetCookies(getSetCookies(response.headers))

    const text = await response.text()
    let parsed: any = {}
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        if (!response.ok) {
          throw new NeteaseError(
            `Netease HTTP ${response.status}`,
            response.status,
            text,
          )
        }
        throw new NeteaseError(
          'Netease 返回了无法解析的内容',
          response.status,
          text,
        )
      }
    }

    if (!response.ok) {
      throw new NeteaseError(
        parsed?.message || parsed?.msg || `Netease HTTP ${response.status}`,
        response.status,
        parsed,
      )
    }

    return normalizeBody(parsed) as T
  }

  private async xeapiRequest<T>(
    uri: string,
    data: Record<string, unknown>,
    options: RequestOptions,
  ): Promise<T> {
    const keyState = await this.ensureXeapiKey()
    const cookie = this.buildCookie(uri, options.cookie)
    const isAndroidCookie = cookie.os === 'android'
    const os = 'android'
    const osver = isAndroidCookie ? cookie.osver || '16' : '16'
    const appver = isAndroidCookie ? cookie.appver || '9.1.65' : '9.1.65'
    const buildver = cookie.buildver || Math.floor(Date.now() / 1000).toString()

    const xeapiCookie: Record<string, string> = {
      ...cookie,
      os,
      osver,
      appver,
      buildver,
      deviceId: cookie.deviceId || this.deviceId,
      sDeviceId: cookie.sDeviceId || cookie.deviceId || this.deviceId,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      Accept: '*/*',
      'User-Agent': this.ua || XEAPI_UA,
      'X-Client-Enc-State': 'ENCRYPTED',
      'x-aeapi': 'true',
      'x-deviceid': xeapiCookie.deviceId,
      'x-os': os,
      'x-osver': osver,
      'x-appver': appver,
      'x-sdeviceid': xeapiCookie.sDeviceId,
      'x-buildver': buildver,
      ...this.baseHeaders,
      ...(options.headers ?? {}),
    }
    if (xeapiCookie.MUSIC_U) headers['x-music-u'] = xeapiCookie.MUSIC_U
    headers.Cookie = serializeCookie(xeapiCookie)

    const ip = options.realIP ?? this.realIP
    if (ip) {
      headers['X-Real-IP'] = ip
      headers['X-Forwarded-For'] = ip
    }

    const encrypted = await xeapiEncrypt(uri, data, keyState, this.xeapiSession, os)
    const url = `${options.domain || this.xeapiDomain}/xeapi/${uri.slice(5)}`
    const body = toForm(encrypted).toString()

    const response = await this.fetchWithTimeout(
      url,
      { method: 'POST', headers, body },
      options.timeout ?? this.defaultTimeout,
    )

    this.applySetCookies(getSetCookies(response.headers))

    const ssid = response.headers.get('x-encr-ssid')
    const sskey = response.headers.get('x-encr-sskey')
    if (ssid && sskey) {
      this.xeapiSession = { id: ssid, key: sskey }
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    if (!response.ok) {
      let parsed: unknown = buffer.toString('utf8')
      try {
        parsed = JSON.parse(String(parsed))
      } catch {
        // 保持原始文本
      }
      throw new NeteaseError(
        `Netease HTTP ${response.status}`,
        response.status,
        parsed,
      )
    }

    let parsed: any
    try {
      parsed = xeapiDecryptResponse(buffer)
    } catch (error) {
      // 安全校验失败时服务端也可能返回明文 JSON
      try {
        parsed = JSON.parse(buffer.toString('utf8'))
      } catch {
        throw new NeteaseError(
          `xeapi 响应解密失败: ${(error as Error).message}`,
          response.status,
          buffer.toString('utf8'),
        )
      }
    }

    return normalizeBody(parsed) as T
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeout?: number,
  ): Promise<Response> {
    const signal =
      timeout && timeout > 0 ? AbortSignal.timeout(timeout) : undefined
    try {
      return await this.fetchImpl(url, { ...init, signal })
    } catch (error) {
      const err = error as Error & { cause?: unknown }
      const cause =
        err.cause instanceof Error
          ? ` (${err.cause.message})`
          : err.cause
            ? ` (${String(err.cause)})`
            : ''
      throw new NeteaseError(
        `Netease 请求失败: ${err.message || String(error)}${cause}`,
        0,
      )
    }
  }

  // -------------------------------------------------------------------------
  // xeapi 公钥
  // -------------------------------------------------------------------------

  private async ensureXeapiKey(): Promise<XeapiKeyState> {
    if (this.xeapiKey) return this.xeapiKey
    if (!this.xeapiKeyPromise) {
      this.xeapiKeyPromise = this.fetchXeapiKey()
        .then((key) => {
          this.xeapiKey = key
          return key
        })
        .finally(() => {
          this.xeapiKeyPromise = null
        })
    }
    return this.xeapiKeyPromise
  }

  private async fetchXeapiKey(): Promise<XeapiKeyState> {
    const nonce = randomDigits(16)
    const timestamp = String(Date.now())
    const data = {
      appVersion: '9.1.65',
      currentKeyVersion: this.xeapiKey?.version ?? '',
      deviceId: this.deviceId,
      nonce,
      os: 'android',
      requestType: 'active',
      signature: xeapiSign(timestamp, nonce),
      t1: '',
      t2: '',
      timestamp,
      uid: '',
    }

    const response = await this.fetchWithTimeout(
      `${this.apiDomain}/api/gorilla/anti/crawler/security/key/get`,
      {
        method: 'POST',
        headers: {
          'User-Agent': this.ua || XEAPI_UA,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          Cookie: serializeCookie({ deviceId: this.deviceId }),
        },
        body: toForm(data).toString(),
      },
      this.defaultTimeout,
    )

    let json: any
    try {
      json = await response.json()
    } catch {
      throw new NeteaseError(
        `获取 xeapi 公钥失败（HTTP ${response.status}）`,
        response.status,
      )
    }

    if (!response.ok || json?.code !== 200 || !json?.data?.encryptedData) {
      throw new NeteaseError('获取 xeapi 公钥失败', response.status, json)
    }
    if (
      !json.data.signature ||
      xeapiSign(json.data.timestamp, nonce) !== json.data.signature
    ) {
      throw new NeteaseError(
        'xeapi 公钥响应签名校验失败',
        response.status,
        json,
      )
    }

    const keyState = JSON.parse(
      aesEcbDecrypt(
        XEAPI_STATIC_KEY,
        Buffer.from(json.data.encryptedData, 'base64'),
      ).toString('utf8'),
    ) as XeapiKeyState

    if (!keyState.sk) {
      throw new NeteaseError('xeapi 公钥响应缺少 sk', response.status, json)
    }
    return keyState
  }

  // -------------------------------------------------------------------------
  // 游客 / 登录
  // -------------------------------------------------------------------------

  /**
   * 注册匿名账号并保存返回的 MUSIC_A。
   * 未登录时很多接口（尤其是 songUrl）都需要它。
   */
  async registerAnonymous(): Promise<NeteaseResponse> {
    const xorKey = '3go8&$8*3*3h0k(2)2'
    let xored = ''
    for (let i = 0; i < this.deviceId.length; i++) {
      xored += String.fromCharCode(
        this.deviceId.charCodeAt(i) ^ xorKey.charCodeAt(i % xorKey.length),
      )
    }
    const username = Buffer.from(
      `${this.deviceId} ${md5Base64(xored)}`,
      'utf8',
    ).toString('base64')

    const body = await this.request<NeteaseResponse>(
      '/api/register/anonimous',
      { username },
      { crypto: 'xeapi' },
    )

    if (body.code === 200) {
      const musicA = this.jar.MUSIC_A
      if (musicA) {
        this.anonymousToken = musicA
      }
    }
    return body
  }

  async loginQrKey(options: RequestOptions = {}): Promise<LoginQrKeyResponse> {
    return this.request<LoginQrKeyResponse>(
      '/api/login/qrcode/unikey',
      { type: 3 },
      options,
    )
  }

  async loginQrCreate(
    key: string | number,
    options: RequestOptions & {
      platform?: 'pc' | 'web'
      /** 需要二维码 DataURL 时传入渲染函数，例如 qrcode.toDataURL */
      renderQr?: (url: string) => string | Promise<string>
    } = {},
  ): Promise<LoginQrCreateResponse> {
    const platform = options.platform ?? 'pc'
    let qrurl = `${this.webDomain}/login?codekey=${key}`
    if (platform === 'web') {
      const cookie = this.getCookie()
      const deviceId =
        parseCookieString(cookie).sDeviceId ||
        `unknown-${Math.floor(Math.random() * 1e6)}`
      qrurl += `&chainId=v1_${deviceId}_web_login_${Date.now()}`
    }
    let qrimg = ''
    if (options.renderQr) {
      qrimg = await options.renderQr(qrurl)
    }
    return {
      code: 200,
      data: { qrurl, qrimg },
    }
  }

  /**
   * 轮询扫码状态：800 过期 / 801 等待扫码 / 802 待确认 / 803 成功。
   * 成功后 cookie 会自动写入客户端。
   */
  async loginQrCheck(
    key: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request<NeteaseResponse>(
      '/api/login/qrcode/client/login',
      { key, type: 3 },
      options,
    )
  }

  async loginByCellphone(
    options: CellphoneLoginOptions,
  ): Promise<NeteaseResponse> {
    const {
      phone,
      countrycode = '86',
      password,
      md5Password,
      captcha,
      ...requestOptions
    } = options
    if (!captcha && !password && !md5Password) {
      throw new TypeError(
        'loginByCellphone 需要 password / md5Password / captcha',
      )
    }
    const data: Record<string, unknown> = {
      type: '1',
      https: 'true',
      phone,
      countrycode,
      captcha,
      remember: 'true',
    }
    data[captcha ? 'captcha' : 'password'] = captcha
      ? captcha
      : md5Password || md5(password as string)
    return this.request<NeteaseResponse>('/api/w/login/cellphone', data, {
      crypto: 'weapi',
      ...requestOptions,
    })
  }

  async loginByEmail(options: EmailLoginOptions): Promise<NeteaseResponse> {
    const {
      email,
      password,
      md5Password,
      rememberLogin = true,
      ...requestOptions
    } = options
    if (!password && !md5Password) {
      throw new TypeError('loginByEmail 需要 password 或 md5Password')
    }
    return this.request<NeteaseResponse>(
      '/api/w/login',
      {
        type: '0',
        https: 'true',
        username: email,
        password: md5Password || md5(password as string),
        rememberLogin: String(rememberLogin),
      },
      requestOptions,
    )
  }

  async loginStatus(options: RequestOptions = {}): Promise<NeteaseResponse> {
    return this.request<NeteaseResponse>(
      '/api/w/nuser/account/get',
      {},
      { crypto: 'weapi', ...options },
    )
  }

  async logout(options: RequestOptions = {}): Promise<NeteaseResponse> {
    const body = await this.request<NeteaseResponse>('/api/logout', {}, options)
    delete this.jar.MUSIC_U
    delete this.jar.MUSIC_A
    this.anonymousToken = ''
    return body
  }

  // -------------------------------------------------------------------------
  // 搜索
  // -------------------------------------------------------------------------

  /** 旧版搜索接口，返回字段较少 */
  search(
    keywords: string,
    options: SearchOptions = {},
  ): Promise<SearchResponse> {
    const { type = 1, limit = 30, offset = 0, ...requestOptions } = options
    return this.request<SearchResponse>(
      '/api/search/get',
      { s: keywords, type, limit, offset },
      requestOptions,
    )
  }

  /** 新版搜索接口，推荐使用 */
  cloudSearch(
    keywords: string,
    options: SearchOptions = {},
  ): Promise<SearchResponse> {
    const { type = 1, limit = 30, offset = 0, ...requestOptions } = options
    return this.request<SearchResponse>(
      '/api/cloudsearch/pc',
      { s: keywords, type, limit, offset, total: true },
      requestOptions,
    )
  }

  searchDefault(options: RequestOptions = {}): Promise<NeteaseResponse> {
    return this.request('/api/search/defaultkeyword/get', {}, options)
  }

  searchHot(options: RequestOptions = {}): Promise<NeteaseResponse> {
    return this.request('/api/search/hot', { type: 1111 }, options)
  }

  searchHotDetail(options: RequestOptions = {}): Promise<NeteaseResponse> {
    return this.request(
      '/api/hotsearchlist/get',
      {},
      { crypto: 'weapi', ...options },
    )
  }

  searchSuggest(
    keywords: string,
    options: RequestOptions & { type?: 'web' | 'mobile' } = {},
  ): Promise<NeteaseResponse> {
    const { type = 'web', ...requestOptions } = options
    const endpoint = type === 'mobile' ? 'keyword' : 'web'
    return this.request(
      `/api/search/suggest/${endpoint}`,
      { s: keywords },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  // -------------------------------------------------------------------------
  // 歌曲
  // -------------------------------------------------------------------------

  async songDetail(
    ids: string | number | Array<string | number>,
    options: RequestOptions = {},
  ): Promise<SongDetailResponse> {
    const idList = normalizeIds(ids)
    return this.request<SongDetailResponse>(
      '/api/v3/song/detail',
      { c: idJson(idList) },
      { crypto: 'weapi', ...options },
    )
  }

  /** 获取播放链接（v1，按音质等级） */
  async songUrl(
    ids: string | number | Array<string | number>,
    options: SongUrlOptions = {},
  ): Promise<SongUrlResponse> {
    const { level = 'standard', ...requestOptions } = options
    const idList = normalizeIds(ids)
    const data: Record<string, unknown> = {
      ids: `[${idList.join(',')}]`,
      level,
      encodeType: 'flac',
    }
    if (level === 'sky') data.immerseType = 'c51'
    return this.request<SongUrlResponse>(
      '/api/song/enhance/player/url/v1',
      data,
      { crypto: 'xeapi', ...requestOptions },
    )
  }

  /** 获取下载链接（v1） */
  async songDownloadUrl(
    id: string | number,
    options: SongUrlOptions = {},
  ): Promise<NeteaseResponse> {
    const { level = 'exhigh', ...requestOptions } = options
    const data: Record<string, unknown> = { id, level }
    if (level === 'sky') data.immerseType = 'c51'
    return this.request(
      '/api/song/enhance/download/url/v1',
      data,
      requestOptions,
    )
  }

  /** 检查歌曲是否可播放 */
  async checkMusic(
    id: string | number,
    options: SongUrlOptions & { br?: number } = {},
  ): Promise<NeteaseResponse> {
    const { br = 999000, ...rest } = options
    const result = await this.request<SongUrlResponse>(
      '/api/song/enhance/player/url',
      { ids: `[${normalizeIds(id)[0]}]`, br },
      { crypto: 'weapi', ...rest },
    )
    const playable = result.code === 200 && result.data?.[0]?.code === 200
    return playable
      ? { code: 200, success: true, message: 'ok' }
      : { code: 200, success: false, message: '亲爱的,暂无版权' }
  }

  lyric(
    id: string | number,
    options: RequestOptions = {},
  ): Promise<LyricResponse> {
    return this.request<LyricResponse>(
      '/api/song/lyric',
      { id, tv: -1, lv: -1, rv: -1, kv: -1, _nmclfl: 1 },
      options,
    )
  }

  /** 新版歌词，包含逐字歌词（yrc） */
  lyricNew(
    id: string | number,
    options: RequestOptions = {},
  ): Promise<LyricResponse> {
    return this.request<LyricResponse>(
      '/api/song/lyric/v1',
      { id, cp: false, tv: 0, lv: 0, rv: 0, kv: 0, yv: 0, ytv: 0, yrv: 0 },
      options,
    )
  }

  /** 红心 / 取消红心 */
  like(
    id: string | number,
    like = true,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      '/api/radio/like',
      { alg: 'itembased', trackId: id, like, time: '3' },
      { crypto: 'weapi', ...options },
    )
  }

  /** 喜欢歌曲（需要 uid） */
  songLike(
    id: string | number,
    options: RequestOptions & {
      uid: string | number
      like?: boolean
    },
  ): Promise<NeteaseResponse> {
    const { uid, like = true, ...requestOptions } = options
    return this.request(
      '/api/song/like',
      { trackId: id, userid: uid, like },
      requestOptions,
    )
  }

  /** 我喜欢的歌曲 id 列表 */
  likelist(
    uid: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request('/api/song/like/get', { uid }, options)
  }

  /** 相似歌曲 */
  simiSong(
    id: string | number,
    options: PageOptions & RequestOptions = {},
  ): Promise<NeteaseResponse> {
    const { limit = 50, offset = 0, ...requestOptions } = options
    return this.request(
      '/api/v1/discovery/simiSong',
      { songid: id, limit, offset },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  // -------------------------------------------------------------------------
  // 专辑 / 歌手
  // -------------------------------------------------------------------------

  album(
    id: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      `/api/v1/album/${id}`,
      {},
      { crypto: 'weapi', ...options },
    )
  }

  albumDetailDynamic(
    id: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      '/api/album/detail/dynamic',
      { id },
      { crypto: 'weapi', ...options },
    )
  }

  albumSub(
    id: string | number,
    sub = true,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      `/api/album/${sub ? 'sub' : 'unsub'}`,
      { id },
      { crypto: 'weapi', ...options },
    )
  }

  artist(
    id: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      `/api/v1/artist/${id}`,
      {},
      { crypto: 'weapi', ...options },
    )
  }

  artistDetail(
    id: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request('/api/artist/head/info/get', { id }, options)
  }

  artistSongs(
    id: string | number,
    options: PageOptions & RequestOptions & { order?: 'hot' | 'time' } = {},
  ): Promise<NeteaseResponse> {
    const {
      limit = 100,
      offset = 0,
      order = 'hot',
      ...requestOptions
    } = options
    return this.request(
      '/api/v1/artist/songs',
      {
        id,
        private_cloud: 'true',
        work_type: 1,
        order,
        offset,
        limit,
      },
      requestOptions,
    )
  }

  artistAlbum(
    id: string | number,
    options: PageOptions & RequestOptions = {},
  ): Promise<NeteaseResponse> {
    const { limit = 30, offset = 0, ...requestOptions } = options
    return this.request(
      `/api/artist/albums/${id}`,
      { limit, offset, total: true },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  artistTopSongs(
    id: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      '/api/artist/top/song',
      { id },
      { crypto: 'weapi', ...options },
    )
  }

  // -------------------------------------------------------------------------
  // 歌单 / 榜单
  // -------------------------------------------------------------------------

  playlistDetail(
    id: string | number,
    options: RequestOptions & { s?: number } = {},
  ): Promise<PlaylistDetailResponse> {
    const { s = 8, ...requestOptions } = options
    return this.request<PlaylistDetailResponse>(
      '/api/v6/playlist/detail',
      { id, n: 100000, s },
      requestOptions,
    )
  }

  /** 获取歌单内全部歌曲（自动分批拉取详情） */
  async playlistTrackAll(
    id: string | number,
    options: PageOptions & RequestOptions & { s?: number } = {},
  ): Promise<SongDetailResponse> {
    const { limit = 1000, offset = 0, s = 8, ...requestOptions } = options
    const detail = await this.playlistDetail(id, {
      s,
      ...requestOptions,
    })
    const trackIds = detail.playlist?.trackIds ?? []
    const ids = trackIds
      .slice(offset, offset + limit)
      .map((item) => String(item.id))
    if (!ids.length) {
      return { code: 200, songs: [], privileges: [] }
    }
    return this.songDetail(ids, requestOptions)
  }

  playlistCreate(
    name: string,
    options: PlaylistCreateOptions = {},
  ): Promise<NeteaseResponse> {
    const { privacy = 0, type = 'NORMAL', ...requestOptions } = options
    return this.request(
      '/api/playlist/create',
      { name, privacy: String(privacy), type },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  playlistDelete(
    id: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      '/api/playlist/remove',
      { ids: `[${normalizeIds(id)[0]}]` },
      { crypto: 'weapi', ...options },
    )
  }

  playlistTrackAdd(
    pid: string | number,
    ids: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      '/api/playlist/track/add',
      {
        id: pid,
        tracks: JSON.stringify(
          normalizeIds(ids).map((id) => ({ type: 3, id: Number(id) })),
        ),
      },
      { crypto: 'weapi', ...options },
    )
  }

  playlistTrackDelete(
    pid: string | number,
    ids: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      '/api/playlist/track/delete',
      {
        id: pid,
        tracks: JSON.stringify(
          normalizeIds(ids).map((id) => ({ type: 3, id: Number(id) })),
        ),
      },
      { crypto: 'weapi', ...options },
    )
  }

  /** 所有榜单摘要 */
  toplist(options: RequestOptions = {}): Promise<NeteaseResponse> {
    return this.request('/api/toplist', {}, options)
  }

  /** 单个榜单详情 */
  topList(
    id: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      '/api/playlist/v4/detail',
      { id, n: '500', s: '0' },
      options,
    )
  }

  // -------------------------------------------------------------------------
  // 推荐 / 用户
  // -------------------------------------------------------------------------

  recommendSongs(
    options: RequestOptions & { afresh?: boolean } = {},
  ): Promise<NeteaseResponse> {
    const { afresh, ...requestOptions } = options
    return this.request(
      '/api/v3/discovery/recommend/songs',
      { afresh },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  recommendResource(options: RequestOptions = {}): Promise<NeteaseResponse> {
    return this.request(
      '/api/v1/discovery/recommend/resource',
      {},
      { crypto: 'weapi', ...options },
    )
  }

  personalized(
    options: RequestOptions & { limit?: number } = {},
  ): Promise<NeteaseResponse> {
    const { limit = 30, ...requestOptions } = options
    return this.request(
      '/api/personalized/playlist',
      { limit, total: true, n: 1000 },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  personalizedNewsong(
    options: RequestOptions & { limit?: number; areaId?: number } = {},
  ): Promise<NeteaseResponse> {
    const { limit = 10, areaId = 0, ...requestOptions } = options
    return this.request(
      '/api/personalized/newsong',
      { type: 'recommend', limit, areaId },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  userAccount(options: RequestOptions = {}): Promise<NeteaseResponse> {
    return this.request(
      '/api/nuser/account/get',
      {},
      { crypto: 'weapi', ...options },
    )
  }

  userDetail(
    uid: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      `/api/v1/user/detail/${uid}`,
      {},
      { crypto: 'weapi', ...options },
    )
  }

  userPlaylist(
    uid: string | number,
    options: PageOptions & RequestOptions = {},
  ): Promise<NeteaseResponse> {
    const { limit = 30, offset = 0, ...requestOptions } = options
    return this.request(
      '/api/user/playlist',
      { uid, limit, offset, includeVideo: true },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  userRecord(
    uid: string | number,
    options: RequestOptions & { type?: 0 | 1 } = {},
  ): Promise<NeteaseResponse> {
    const { type = 0, ...requestOptions } = options
    return this.request(
      '/api/v1/play/record',
      { uid, type },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  userFollows(
    uid: string | number,
    options: PageOptions & RequestOptions = {},
  ): Promise<NeteaseResponse> {
    const { limit = 30, offset = 0, ...requestOptions } = options
    return this.request(
      `/api/user/getfollows/${uid}`,
      { offset, limit, order: true },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  userFolloweds(
    uid: string | number,
    options: PageOptions & RequestOptions = {},
  ): Promise<NeteaseResponse> {
    const { limit = 20, offset = 0, ...requestOptions } = options
    return this.request(
      `/api/user/getfolloweds/${uid}`,
      { userId: uid, time: '0', limit, offset, getcounts: 'true' },
      requestOptions,
    )
  }

  // -------------------------------------------------------------------------
  // 评论
  // -------------------------------------------------------------------------

  commentMusic(
    id: string | number,
    options: PageOptions & RequestOptions & { before?: number } = {},
  ): Promise<NeteaseResponse> {
    const { limit = 20, offset = 0, before = 0, ...requestOptions } = options
    return this.request(
      `/api/v1/resource/comments/R_SO_4_${id}`,
      { rid: id, limit, offset, beforeTime: before },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  /** 新版通用评论列表 */
  commentNew(
    id: string | number,
    options: RequestOptions & {
      type?: number
      pageNo?: number
      pageSize?: number
      /** 99 推荐 / 2 热度 / 3 时间（1 为旧版推荐排序） */
      sortType?: 99 | 2 | 3 | 1
      cursor?: string
      showInner?: boolean
    } = {},
  ): Promise<NeteaseResponse> {
    const {
      type = 0,
      pageNo = 1,
      pageSize = 20,
      sortType: rawSortType = 99,
      cursor,
      showInner = true,
      ...requestOptions
    } = options
    const sortType = rawSortType === 1 ? 99 : rawSortType
    let cursorValue = ''
    if (sortType === 99) cursorValue = String((pageNo - 1) * pageSize)
    else if (sortType === 2)
      cursorValue = `normalHot#${(pageNo - 1) * pageSize}`
    else if (sortType === 3) cursorValue = cursor || '0'

    return this.request(
      '/api/v2/resource/comments',
      {
        threadId: `${RESOURCE_TYPE_MAP[type] ?? RESOURCE_TYPE_MAP[0]}${id}`,
        pageNo,
        showInner,
        pageSize,
        cursor: cursorValue,
        sortType,
      },
      requestOptions,
    )
  }

  /** 发表 / 删除 / 回复评论 */
  comment(
    action: CommentAction,
    options: CommentOptions = {},
  ): Promise<NeteaseResponse> {
    const { type = 0, id, threadId, ...requestOptions } = options
    const thread =
      threadId ??
      (id !== undefined
        ? `${RESOURCE_TYPE_MAP[type] ?? RESOURCE_TYPE_MAP[0]}${id}`
        : '')
    if (!thread) {
      throw new TypeError('comment 需要 id 或 threadId')
    }
    const data: Record<string, unknown> = { threadId: thread }
    if (action.t === 1) data.content = action.content
    else if (action.t === 0) data.commentId = action.commentId
    else if (action.t === 2) {
      data.commentId = action.commentId
      data.content = action.content
    }
    const endpoint = { 1: 'add', 0: 'delete', 2: 'reply' }[action.t]
    return this.request(`/api/resource/comments/${endpoint}`, data, {
      crypto: 'weapi',
      ...requestOptions,
    })
  }

  // -------------------------------------------------------------------------
  // MV / 视频 / 电台 / 打卡
  // -------------------------------------------------------------------------

  mvDetail(
    mvid: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      '/api/v1/mv/detail',
      { id: mvid },
      { crypto: 'weapi', ...options },
    )
  }

  mvUrl(
    id: string | number,
    options: RequestOptions & { r?: number } = {},
  ): Promise<NeteaseResponse> {
    const { r = 1080, ...requestOptions } = options
    return this.request(
      '/api/song/enhance/play/mv/url',
      { id, r },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  videoUrl(
    id: string | number,
    options: RequestOptions & { res?: number } = {},
  ): Promise<NeteaseResponse> {
    const { res = 1080, ...requestOptions } = options
    return this.request(
      '/api/cloudvideo/playurl',
      { ids: JSON.stringify([String(id)]), resolution: res },
      { crypto: 'weapi', ...requestOptions },
    )
  }

  djDetail(
    rid: string | number,
    options: RequestOptions = {},
  ): Promise<NeteaseResponse> {
    return this.request(
      '/api/djradio/v2/get',
      { id: rid },
      { crypto: 'weapi', ...options },
    )
  }

  dailySignin(
    options: RequestOptions & { type?: 0 | 1 } = {},
  ): Promise<NeteaseResponse> {
    const { type = 0, ...requestOptions } = options
    return this.request('/api/point/dailyTask', { type }, requestOptions)
  }

  /** 听歌打卡：同时写入最近播放与听歌排行 */
  async scrobble(
    id: string | number,
    options: ScrobbleOptions,
  ): Promise<NeteaseResponse> {
    const { sourceid, time, ...requestOptions } = options
    let baseCookie = this.getCookie()
    if (requestOptions.cookie) {
      baseCookie =
        typeof requestOptions.cookie === 'string'
          ? requestOptions.cookie
          : serializeCookie(requestOptions.cookie)
    }
    const cookie = `${baseCookie}; os=osx`

    const optionsWithCookie: RequestOptions = {
      crypto: 'eapi',
      domain: CLIENT_LOG_DOMAIN,
      ...requestOptions,
      cookie,
    }

    const startplay = await this.request(
      '/api/feedback/weblog',
      {
        logs: JSON.stringify([
          {
            action: 'startplay',
            json: {
              id,
              type: 'song',
              mainsite: '1',
              mainsiteWeb: '1',
              content: `id=${sourceid}`,
            },
          },
        ]),
      },
      optionsWithCookie,
    )

    const play = await this.request(
      '/api/feedback/weblog',
      {
        logs: JSON.stringify([
          {
            action: 'play',
            json: {
              download: 0,
              end: 'playend',
              id,
              sourceId: sourceid,
              time,
              type: 'song',
              wifi: 0,
              source: 'list',
              mainsite: '1',
              mainsiteWeb: '1',
              content: `id=${sourceid}`,
            },
          },
        ]),
      },
      optionsWithCookie,
    )

    return {
      code: 200,
      data: 'success',
      details: { startplay, play },
    }
  }
}

function normalizeBody(body: any): any {
  if (body && typeof body === 'object' && 'code' in body) {
    const code = Number(body.code)
    if (!Number.isNaN(code)) body.code = code
  }
  return body
}

export default NeteaseClient
