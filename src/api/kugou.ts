/**
 * KuGou Music 直连 TypeScript SDK
 *
 * 直接请求酷狗官方接口，不依赖本项目现有的 Express 中转服务。
 * 与 `util/request.js` 的行为保持一致（设备标识、签名、伪造请求头、代理），
 * 但做了以下现代化改造：
 *
 * - 使用 `node:crypto` 替换 crypto-js / node-forge / big-integer
 * - 使用 `node:zlib` 替换 pako（KRC 歌词解压）
 * - 仅保留 `axios` 作为运行时依赖（需要其代理能力）
 * - 内置 Cookie 容器，登录 / 设备注册后自动保存 token、userid、dfid
 * - 完整的 TypeScript 类型与 JSDoc
 *
 * 运行环境：Node.js >= 18
 *
 * @example
 * ```ts
 * import { KugouClient } from './sdk/kugou';
 *
 * const kg = new KugouClient();
 * const search = await kg.search({ keywords: '海阔天空', page: 1, pagesize: 30 });
 * console.log(search.body.data.lists);
 *
 * // 首次调用会自动注册设备获取 dfid，避免 SSA 风控
 * const url = await kg.getSongUrl({ hash: '...', albumAudioId: 123456, quality: '128' });
 * console.log(url.body.url?.[0]);
 * ```
 *
 * @example
 * ```ts
 * // 登录后 Client 会自动保存 token / userid，后续请求无需手动传 Cookie
 * const kg = new KugouClient();
 * await kg.sendCaptcha({ mobile: '13800138000' });
 * await kg.loginCellphone({ mobile: '13800138000', code: '123456' });
 * const mine = await kg.getUserPlaylists({ page: 1, pagesize: 30 });
 * ```
 */

import axios, { type AxiosProxyConfig, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import {
  AES,
  Base64,
  CBC,
  CipherParams,
  Hex,
  MD5,
  Pkcs7,
  Utf8,
  WordArray,
} from 'crypto-es';
import forge from 'node-forge';
import { inflate } from 'pako';
import { Buffer } from 'buffer';

// ============================================================
// 常量
// ============================================================

/** 标准版配置 */
const STANDARD_CONFIG = { appid: 1005, clientver: 20489 } as const;
/** 概念版（lite）配置 */
const LITE_CONFIG = { appid: 3116, clientver: 11440 } as const;

/** Android 签名盐值（标准版） */
const ANDROID_SALT = 'OIlwieks28dk2k092lksi2UIkp';
/** Android 签名盐值（概念版） */
const LITE_ANDROID_SALT = 'LnT6xpN3khm36zse0QzvmgTZ3waWdRSA';
/** Web 签名盐值 */
const WEB_SALT = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt';

/** signKey 盐值（标准版） */
const SIGN_KEY_SALT = '57ae12eb6890223e355ccfcb74edf70d';
/** signKey 盐值（概念版） */
const LITE_SIGN_KEY_SALT = '185672dd44712f60bb1736df5a377e82';

/** 默认网关 */
const GATEWAY = 'https://gateway.kugou.com';
/** 默认 User-Agent */
const DEFAULT_USER_AGENT = 'Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi';

/** 酷狗内部请求头 */
const INTERNAL_HEADERS = {
  'kg-rc': '1',
  'kg-thash': '5d816a0',
  'kg-rec': 1,
  'kg-rf': 'B9EDA08A64250DEFFBCADDEE00F8F25F',
} as const;

/** 概念版登录 t1/t2 加密参数 */
const LITE_T1 = { key: '5e4ef500e9597fe004bd09a46d8add98', iv: '04bd09a46d8add98' } as const;
const LITE_T2 = { key: 'fd14b35e3f81af3817a20ae7adae7020', iv: '17a20ae7adae7020' } as const;

/** RSA 公钥（标准版） */
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDIAG7QOELSYoIJvTFJhMpe1s/gbjDJX51HBNnEl5HXqTW6lQ7LC8jr9fWZTwusknp+sVGzwd40MwP6U5yDE27M/X1+UR4tvOGOqp94TJtQ1EPnWGWXngpeIW5GxoQGao1rmYWAu6oi1z9XkChrsUdC6DJE5E221wf/4WLFxwAtRQIDAQAB
-----END PUBLIC KEY-----`;

/** RSA 公钥（概念版） */
const LITE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDECi0Np2UR87scwrvTr72L6oO01rBbbBPriSDFPxr3Z5syug0O24QyQO8bg27+0+4kBzTBTBOZ/WWU0WryL1JSXRTXLgFVxtzIY41Pe7lPOgsfTCn5kZcvKhYKJesKnnJDNr5/abvTGf+rHG3YRwsCHcQ08/q6ifSioBszvb3QiwIDAQAB
-----END PUBLIC KEY-----`;

/** KRC 歌词 XOR 密钥 */
const KRC_KEY = [64, 71, 97, 119, 94, 50, 116, 71, 81, 54, 49, 45, 206, 210, 110, 105];

const MAGIC_QUALITIES = new Set(['piano', 'acappella', 'subwoofer', 'ancient', 'dj', 'surnay']);

// ============================================================
// 类型
// ============================================================

/** 平台类型：标准版 / 概念版 */
export type KugouPlatform = 'standard' | 'lite';

/** 签名类型 */
export type EncryptType = 'android' | 'web' | 'register';

/** Cookie 键值对 */
export interface CookieMap {
  [key: string]: string;
}

/** 统一响应结构 */
export interface KugouResponse<T = Record<string, any>> {
  /** 200 = 成功，502 = 失败 */
  status: number;
  /** 响应体 */
  body: T;
  /** 响应头（小写 key） */
  headers: Record<string, string>;
  /** 响应中的 Set-Cookie（已规范化为 `key=value`） */
  cookie: string[];
}

/** 底层请求配置 */
export interface KugouRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'get' | 'post';
  baseURL?: string;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string | number>;
  encryptType?: EncryptType;
  /** 是否生成 signKey（需要 params.hash） */
  encryptKey?: boolean;
  /** 清空默认参数（appid/clientver/mid/clienttime 等） */
  clearDefaultParams?: boolean;
  /** 跳过 signature 签名 */
  notSignature?: boolean;
  /** 响应类型，`arraybuffer` 用于设备注册等二进制接口 */
  responseType?: 'json' | 'arraybuffer';
  /** 单次请求超时（毫秒） */
  timeout?: number;
  /** 单次请求代理；false 表示强制不走代理 */
  proxy?: string | false;
  /** 单次请求使用额外的 Cookie（不会写回 Client） */
  cookie?: CookieMap;
  /** 客户端 IP（可选，用于透传） */
  ip?: string;
  /** 真实 IP（优先级高于 ip） */
  realIP?: string;
}

/** Client 配置 */
export interface KugouClientOptions {
  /** 平台，默认读取环境变量 platform（lite） */
  platform?: KugouPlatform;
  /** 覆盖 appid */
  appId?: number;
  /** 覆盖 clientver */
  clientVer?: number;
  /** 初始 Cookie，支持字符串或对象 */
  cookie?: string | CookieMap;
  /** 设备 GUID，默认随机 UUID v4 */
  guid?: string;
  /** 设备 MID，默认由 GUID 计算 */
  mid?: string;
  /** 设备 DEV，默认随机 10 位大写字符串 */
  dev?: string;
  /** 设备 MAC，默认 02:00:00:00:00:00 */
  mac?: string;
  /** WebGL 指纹，默认随机 uint64 */
  webgl?: string;
  /** 代理地址，默认读取环境变量 KUGOU_API_PROXY；false 表示不走代理 */
  proxy?: string | false;
  /** 请求超时（毫秒），默认 15000 */
  timeout?: number;
  /** 覆盖 User-Agent */
  userAgent?: string;
  /** 自定义 fetch（Tauri 环境注入 Rust HTTP，绕过 CORS） */
  fetch?: typeof fetch;
  /** 获取歌曲 URL 前若没有 dfid，是否自动注册设备（默认 true） */
  autoRegisterDevice?: boolean;
}

/** 搜索类型 */
export type SearchType = 'song' | 'special' | 'lyric' | 'album' | 'author' | 'mv';

/** 音质 */
export type SongQuality =
  | '128'
  | '320'
  | 'flac'
  | 'high'
  | 'multitrack'
  | 'viper_atmos'
  | 'viper_clear'
  | 'viper_tape'
  | 'super'
  | 'piano'
  | 'acappella'
  | 'subwoofer'
  | 'ancient'
  | 'dj'
  | 'surnay';

/** 歌曲（酷狗搜索接口返回的字段为 PascalCase，保留索引签名兼容其他接口） */
export interface KugouSong {
  FileHash?: string;
  FileName?: string;
  SingerName?: string;
  AlbumID?: string | number;
  AlbumName?: string;
  MixSongID?: string | number;
  SongID?: string | number;
  Duration?: number;
  ExtName?: string;
  Bitrate?: number;
  FileSize?: number;
  HQ?: {
    Hash?: string;
    FileSize?: number;
    Privilege?: number;
  };
  [key: string]: any;
}

/** 歌词接口返回体 */
export interface LyricBody {
  status?: number;
  content?: string;
  contenttype?: number | string;
  /** 解码后的歌词（仅 decode=true 时存在） */
  decodeContent?: string;
  [key: string]: any;
}

// ---------- 请求参数 ----------

export interface SearchParams {
  keywords: string;
  page?: number;
  pagesize?: number;
  type?: SearchType;
}

export interface SearchSuggestParams {
  keywords: string;
  albumTipCount?: number;
  correctTipCount?: number;
  mvTipCount?: number;
  musicTipCount?: number;
}

export interface SearchLyricParams {
  keywords?: string;
  hash?: string;
  albumAudioId?: string | number;
  duration?: number | string;
  man?: 'yes' | 'no';
}

export interface LyricParams {
  id: string;
  accesskey: string;
  fmt?: 'lrc' | 'krc';
  client?: 'android' | 'web';
  /** 是否解码歌词内容 */
  decode?: boolean;
}

export interface SongUrlParams {
  hash: string;
  albumId?: string | number;
  albumAudioId?: string | number;
  quality?: SongQuality;
  freePart?: boolean;
}

export interface SongPrivilegeParams {
  hashes: string | string[];
  albumIds?: string | number | Array<string | number>;
}

export interface PlaylistDetailParams {
  ids: string | string[];
}

export interface PlaylistTracksParams {
  listid: string;
  page?: number;
  pagesize?: number;
}

export interface TopPlaylistParams {
  categoryId?: number;
  page?: number;
  pagesize?: number;
  withtag?: 0 | 1;
  withsong?: 0 | 1;
  moduleId?: number;
  sort?: number;
}

export interface AlbumDetailParams {
  albumId: string | number;
  fields?: string;
  isBuy?: 0 | 1;
}

export interface AlbumSongsParams {
  albumId: string | number;
  page?: number;
  pagesize?: number;
  isBuy?: 0 | 1;
}

export interface AlbumsParams {
  albumIds: string | Array<string | number>;
  fields?: string;
}

export interface ArtistSongsParams {
  id: string | number;
  page?: number;
  pagesize?: number;
  sort?: 'hot' | 'new';
}

export interface ArtistAlbumsParams {
  id: string | number;
  page?: number;
  pagesize?: number;
  sort?: 'hot' | 'new';
}

export interface RankListParams {
  withsong?: 0 | 1;
}

export interface RankInfoParams {
  rankid: string | number;
  rankCid?: string | number;
  albumImg?: 0 | 1;
  zone?: string;
}

export interface RankSongsParams {
  rankid: string | number;
  rankCid?: string | number;
  page?: number;
  pagesize?: number;
}

export interface DailyRecommendParams {
  platform?: 'android' | 'ios';
  userid?: string | number;
}

export interface PersonalFmParams {
  hash?: string;
  songid?: string | number;
  playtime?: string | number;
  mode?: 'normal' | 'small' | 'peak';
  action?: 'play' | 'garbage';
  songPoolId?: 0 | 1 | 2;
  isOverplay?: boolean;
  remainSongcnt?: number;
  userid?: string | number;
  platform?: 'android' | 'ios';
}

export interface NewSongsParams {
  /** 榜单 id，默认 21608 */
  type?: string | number;
  page?: number;
  pagesize?: number;
  userid?: string | number;
}

export interface UserPlaylistsParams {
  page?: number;
  pagesize?: number;
}

export interface LoginCellphoneParams {
  mobile: string;
  code: string;
  userid?: string | number;
}

export interface CaptchaParams {
  mobile: string;
}

// ============================================================
// 错误类型
// ============================================================

/** 酷狗接口错误（携带原始响应信息） */
export class KugouApiError extends Error {
  readonly status: number;
  readonly body: any;
  readonly headers: Record<string, string>;
  readonly cookie: string[];

  constructor(response: KugouResponse<any>) {
    const msg =
      response.body && typeof response.body === 'object' && typeof response.body.msg === 'string'
        ? response.body.msg
        : `KuGou API request failed (status=${response.status})`;
    super(msg);
    this.name = 'KugouApiError';
    this.status = response.status;
    this.body = response.body;
    this.headers = response.headers;
    this.cookie = response.cookie;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================================
// 通用工具
// ============================================================

/** 文本 / 字节 → WordArray */
function toWordArray(input: string | Uint8Array): WordArray {
  return typeof input === 'string' ? Utf8.parse(input) : new WordArray(input);
}

/** WordArray → Buffer */
function wordArrayToBuffer(wordArray: WordArray): Buffer {
  const { words, sigBytes } = wordArray;
  const out = Buffer.alloc(sigBytes);
  for (let i = 0; i < sigBytes; i += 1) {
    out[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return out;
}

/** 读取环境变量（浏览器环境返回 undefined） */
function getEnv(name: string): string | undefined {
  try {
    return typeof process !== 'undefined' ? process.env?.[name] : undefined;
  } catch {
    return undefined;
  }
}

/** 安全随机字节（浏览器 / Node 通用） */
function randomBytes(size: number): Buffer {
  const bytes = new Uint8Array(size);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < size; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Buffer.from(bytes);
}

/** 生成 UUID v4 */
function randomUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** MD5（hex） */
export function md5(input: string | Uint8Array): string {
  return MD5(toWordArray(input)).toString(Hex);
}

/** 生成随机字符串 */
function randomString(len = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** 根据 GUID 计算设备 MID（等价于 MD5(guid) 的十进制大整数） */
export function calculateMid(guid: string): string {
  return BigInt(`0x${md5(guid)}`).toString();
}

/** 生成 WebGL 指纹（随机 uint64 十进制字符串） */
function generateWebglHash(): string {
  return randomBytes(8).readBigUInt64BE().toString();
}

/** Cookie 字符串转对象（按第一个 `=` 分割） */
export function cookieToObject(input?: string | CookieMap | null): CookieMap {
  if (!input) return {};
  if (typeof input !== 'string') return { ...input };

  const result: CookieMap = {};
  for (const part of input.split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    result[key] = part.slice(index + 1).trim();
  }
  return result;
}

/** 将 Set-Cookie 规范化为 `key=value` */
function normalizeSetCookie(value: string): string {
  return value.split(';')[0].trim();
}

/** 参数值序列化（与旧版签名逻辑保持一致） */
function stringifyParamValue(value: unknown): string {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
}

// ============================================================
// 签名（与 util/helper.js 等价）
// ============================================================

/** Android 签名 */
export function signatureAndroidParams(params: Record<string, any>, data?: string | Buffer, isLite = false): string {
  const salt = isLite ? LITE_ANDROID_SALT : ANDROID_SALT;
  const paramsString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${stringifyParamValue(params[key])}`)
    .join('');

  if (Buffer.isBuffer(data)) {
    return md5(
      Buffer.concat([
        Buffer.from(salt, 'utf8'),
        Buffer.from(paramsString, 'utf8'),
        data,
        Buffer.from(salt, 'utf8'),
      ]),
    );
  }

  return md5(`${salt}${paramsString}${data ?? ''}${salt}`);
}

/** Web 签名 */
export function signatureWebParams(params: Record<string, any>): string {
  const paramsString = Object.keys(params)
    .map((key) => `${key}=${stringifyParamValue(params[key])}`)
    .sort()
    .join('');
  return md5(`${WEB_SALT}${paramsString}${WEB_SALT}`);
}

/** 设备注册签名 */
export function signatureRegisterParams(params: Record<string, any>): string {
  const paramsString = Object.keys(params)
    .map((key) => stringifyParamValue(params[key]))
    .sort()
    .join('');
  return md5(`1014${paramsString}1014`);
}

/** signKey（歌曲 URL 等接口使用） */
export function signKey(hash: string, mid: string, userid?: string | number, appid?: number | string, isLite = false): string {
  const salt = isLite ? LITE_SIGN_KEY_SALT : SIGN_KEY_SALT;
  return md5(`${hash}${salt}${appid || (isLite ? LITE_CONFIG.appid : STANDARD_CONFIG.appid)}${mid}${userid || 0}`);
}

/** 参数 key 签名（signParamsKey） */
export function signParamsKey(data: string | number, appid?: number | string, clientver?: number | string, isLite = false): string {
  const salt = isLite ? LITE_ANDROID_SALT : ANDROID_SALT;
  return md5(
    `${appid || (isLite ? LITE_CONFIG.appid : STANDARD_CONFIG.appid)}${salt}${
      clientver || (isLite ? LITE_CONFIG.clientver : STANDARD_CONFIG.clientver)
    }${data}`
  );
}

// ============================================================
// 加密 / 解密（node:crypto 实现）
// ============================================================

function aesCbcEncrypt(data: string | Buffer, key: string | Buffer, iv: string | Buffer, output: 'hex' | 'base64'): string {
  const encrypted = AES.encrypt(toWordArray(data), toWordArray(key), {
    iv: toWordArray(iv),
    mode: CBC,
    padding: Pkcs7,
  });
  return encrypted.ciphertext!.toString(output === 'hex' ? Hex : Base64);
}

function aesCbcDecrypt(data: Buffer, key: string | Buffer, iv: string | Buffer): string {
  const decrypted = AES.decrypt(
    new CipherParams({ ciphertext: toWordArray(data) }),
    toWordArray(key),
    { iv: toWordArray(iv), mode: CBC, padding: Pkcs7 },
  );
  return wordArrayToBuffer(decrypted).toString('utf8');
}

/** 随机 key 的 AES 加密，返回 hex 密文与原始 key */
function aesEncryptWithRandomKey(data: unknown): { str: string; key: string } {
  const key = randomString(16).toLowerCase();
  const keyHex = md5(key).slice(0, 32);
  return {
    str: aesCbcEncrypt(JSON.stringify(data), keyHex, keyHex.slice(-16), 'hex'),
    key,
  };
}

/** 使用原始 key 解密 AES（与旧版 cryptoAesDecrypt 等价） */
function aesDecryptWithKey(data: string | Buffer, key: string, iv?: string): unknown {
  const keyHex = iv ? key : md5(key).slice(0, 32);
  const ivValue = iv || keyHex.slice(-16);
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');
  const text = aesCbcDecrypt(buffer, keyHex, ivValue);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** 歌单/设备注册 AES 加密 */
function playlistAesEncrypt(data: unknown): { key: string; str: string } {
  const key = randomString(6).toLowerCase();
  const encryptKey = md5(key).slice(0, 16);
  const iv = md5(key).slice(16, 32);
  return {
    key,
    str: aesCbcEncrypt(JSON.stringify(data), encryptKey, iv, 'base64'),
  };
}

/** 歌单/设备注册 AES 解密 */
function playlistAesDecrypt(str: string | Buffer, key: string): unknown {
  const encryptKey = md5(key).slice(0, 16);
  const iv = md5(key).slice(16, 32);
  const buffer = Buffer.isBuffer(str) ? str : Buffer.from(str, 'base64');
  const text = aesCbcDecrypt(buffer, encryptKey, iv);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** 解析 RSA 公钥 */
function getForgePublicKey(pem: string): forge.pki.rsa.PublicKey {
  return forge.pki.publicKeyFromPem(pem) as forge.pki.rsa.PublicKey;
}

/** 无填充 RSA 加密（返回 hex） */
function rsaEncryptNoPadding(data: Buffer, pem: string): string {
  const publicKey = getForgePublicKey(pem);
  const keyLength = Math.ceil(publicKey.n.bitLength() / 8);
  const padded = Buffer.alloc(keyLength);
  data.copy(padded, 0, 0, Math.min(data.length, keyLength));
  const message = new forge.jsbn.BigInteger(padded.toString('hex'), 16);
  const encrypted = message.modPow(publicKey.e, publicKey.n);
  return encrypted.toString(16).padStart(keyLength * 2, '0');
}

/** PKCS#1 v1.5 RSA 加密（返回 hex） */
function rsaEncryptPkcs1(data: Buffer, pem: string): string {
  const publicKey = getForgePublicKey(pem);
  const binary = Array.from(data, (byte) => String.fromCharCode(byte)).join('');
  const encrypted = publicKey.encrypt(binary, 'RSAES-PKCS1-V1_5');
  return forge.util.bytesToHex(encrypted);
}

/** KRC 歌词解码（XOR + zlib inflate） */
export function decodeLyrics(value: string | Uint8Array | Buffer): string {
  let bytes: Buffer;
  if (typeof value === 'string') bytes = Buffer.from(value, 'base64');
  else bytes = Buffer.from(value);

  if (bytes.length <= 4) return '';

  const krc = Buffer.from(bytes.subarray(4));
  for (let i = 0; i < krc.length; i += 1) {
    krc[i] ^= KRC_KEY[i % KRC_KEY.length];
  }

  try {
    return new TextDecoder().decode(inflate(krc));
  } catch {
    return '';
  }
}

// ============================================================
// Cookie 容器
// ============================================================

/** 轻量 Cookie 容器（不使用第三方 cookie jar） */
export class CookieStore {
  private data: CookieMap = {};

  constructor(initial?: string | CookieMap) {
    this.data = cookieToObject(initial);
  }

  get(name: string): string | undefined {
    return this.data[name];
  }

  set(name: string, value: string | number): void {
    this.data[name] = String(value);
  }

  setMany(values: CookieMap): void {
    for (const [key, value] of Object.entries(values)) this.data[key] = String(value);
  }

  /** 仅当不存在时写入 */
  ensure(name: string, value: string | number): void {
    if (this.data[name] === undefined) this.data[name] = String(value);
  }

  delete(name: string): void {
    delete this.data[name];
  }

  toObject(): CookieMap {
    return { ...this.data };
  }

  toHeader(): string {
    return Object.entries(this.data)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  /** 吸收响应中的 Set-Cookie */
  absorb(setCookies: string[]): void {
    for (const item of setCookies) {
      const pair = normalizeSetCookie(item);
      const index = pair.indexOf('=');
      if (index < 1) continue;
      this.data[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
    }
  }

  clear(): void {
    this.data = {};
  }
}

// ============================================================
// 代理
// ============================================================

function parseProxy(raw?: string | false): AxiosProxyConfig | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return undefined;
    const proxy: AxiosProxyConfig = {
      protocol: url.protocol.replace(':', ''),
      host: url.hostname.replace(/^\[|\]$/g, ''),
      port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
    };
    if (url.username || url.password) {
      proxy.auth = {
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
      };
    }
    return proxy;
  } catch {
    return undefined;
  }
}

// ============================================================
// fetch 适配器（替代 axios 的 XHR/Node 适配器，支持 Tauri 原生请求）
// ============================================================

/** 拼接 baseURL / url / params */
function buildRequestUrl(
  baseURL: string | undefined,
  url: string,
  params?: Record<string, any>,
): string {
  const full = /^https?:\/\//i.test(url) ? url : `${baseURL ?? ''}${url}`;
  if (!params) return full;
  const query = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join('&');
  if (!query) return full;
  return `${full}${full.includes('?') ? '&' : '?'}${query}`;
}

/** 基于 fetch 的 axios 适配器 */
function createFetchAdapter(fetchImpl: typeof fetch) {
  return async (config: any): Promise<any> => {
    const rawHeaders =
      typeof config.headers?.toJSON === 'function'
        ? config.headers.toJSON()
        : config.headers ?? {};
    const headers = new Headers();
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (value === undefined || value === null) continue;
      try {
        headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
      } catch {
        // 浏览器禁止部分请求头，忽略即可
      }
    }

    let body: BodyInit | undefined;
    if (config.data !== undefined && config.data !== null) {
      if (
        typeof config.data === 'string' ||
        config.data instanceof ArrayBuffer ||
        ArrayBuffer.isView(config.data)
      ) {
        body = config.data as BodyInit;
      } else {
        body = JSON.stringify(config.data);
        if (!headers.has('content-type')) headers.set('content-type', 'application/json');
      }
    }

    const url = buildRequestUrl(config.baseURL, config.url, config.params);
    const controller = new AbortController();
    const timeout = Number(config.timeout) || 0;
    const timer = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;

    try {
      const response = await fetchImpl(url, {
        method: String(config.method ?? 'GET').toUpperCase(),
        headers,
        body,
        signal: controller.signal,
      });

      const setCookies: string[] =
        typeof (response.headers as any).getSetCookie === 'function'
          ? (response.headers as any).getSetCookie()
          : response.headers.get('set-cookie')
            ? [response.headers.get('set-cookie') as string]
            : [];

      const plainHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        plainHeaders[key] = value;
      });

      const responseHeaders: any = {
        ...plainHeaders,
        'set-cookie': setCookies,
        getSetCookie: () => setCookies,
        toJSON: () => plainHeaders,
      };

      let data: any;
      if (config.responseType === 'arraybuffer') {
        data = Buffer.from(await response.arrayBuffer());
      } else {
        const text = await response.text();
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = text;
        }
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        config,
        request: null,
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}

// ============================================================
// 响应处理
// ============================================================

function parseResponseBody(data: any): any {
  if (Buffer.isBuffer(data) || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
    try {
      return JSON.parse(buffer.toString('utf8'));
    } catch {
      return buffer;
    }
  }

  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  return data;
}

function normalizeHeaders(headers: any): Record<string, string> {
  const source = headers && typeof headers.toJSON === 'function' ? headers.toJSON() : headers || {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    result[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return result;
}

function extractSetCookies(response: AxiosResponse): string[] {
  const headers = response.headers as any;
  let raw = headers?.['set-cookie'] ?? headers?.getSetCookie?.() ?? [];
  if (!Array.isArray(raw)) raw = [raw];
  return raw.filter((item: unknown): item is string => typeof item === 'string' && item.length > 0);
}

// ============================================================
// 主客户端
// ============================================================

export class KugouClient {
  readonly platform: KugouPlatform;
  readonly appid: number;
  readonly clientver: number;
  readonly guid: string;
  readonly mid: string;
  readonly cookies: CookieStore;

  private readonly timeout: number;
  private readonly proxy?: string | false;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof fetch;
  private readonly autoRegisterDevice: boolean;
  private deviceReady?: Promise<void>;

  constructor(options: KugouClientOptions = {}) {
    this.platform = options.platform ?? (getEnv('platform') === 'lite' ? 'lite' : 'standard');
    const config = this.platform === 'lite' ? LITE_CONFIG : STANDARD_CONFIG;

    this.appid = options.appId ?? config.appid;
    this.clientver = options.clientVer ?? config.clientver;
    this.cookies = new CookieStore(options.cookie);
    this.timeout = options.timeout ?? 15000;
    this.proxy = options.proxy ?? getEnv('KUGOU_API_PROXY');
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.autoRegisterDevice = options.autoRegisterDevice ?? true;

    const guid = options.guid ?? this.cookies.get('KUGOU_API_GUID') ?? randomUUID();
    const mid = options.mid ?? this.cookies.get('KUGOU_API_MID') ?? calculateMid(guid);
    const dev = options.dev ?? this.cookies.get('KUGOU_API_DEV') ?? randomString(10).toUpperCase();
    const mac = options.mac ?? this.cookies.get('KUGOU_API_MAC') ?? '02:00:00:00:00:00';
    const webgl = options.webgl ?? this.cookies.get('KUGOU_API_WEBGL') ?? generateWebglHash();

    this.guid = guid;
    this.mid = mid;

    this.cookies.ensure('KUGOU_API_PLATFORM', this.platform === 'lite' ? 'lite' : '');
    this.cookies.ensure('KUGOU_API_MID', mid);
    this.cookies.ensure('KUGOU_API_GUID', guid);
    this.cookies.ensure('KUGOU_API_DEV', dev.toUpperCase());
    this.cookies.ensure('KUGOU_API_MAC', mac.toUpperCase());
    this.cookies.ensure('KUGOU_API_WEBGL', webgl);
  }

  /** 是否概念版 */
  get isLite(): boolean {
    return this.platform === 'lite';
  }

  /** Cookie 字符串 */
  get cookieString(): string {
    return this.cookies.toHeader();
  }

  /** 设置 / 覆盖 Cookie */
  setCookies(input: string | CookieMap): void {
    this.cookies.setMany(cookieToObject(input));
  }

  /** 获取 Cookie 对象 */
  getCookies(): CookieMap {
    return this.cookies.toObject();
  }

  /** 清除登录态（保留设备标识） */
  clearAuth(): void {
    for (const key of ['token', 'userid', 'vip_type', 'vip_token', 't1', 'dfid']) {
      this.cookies.delete(key);
    }
  }

  // ----------------------------------------------------------
  // 底层请求
  // ----------------------------------------------------------

  /**
   * 直接发送酷狗官方请求（底层 API）
   *
   * 自动完成：默认参数注入、signature/signKey、设备请求头、IP 透传、代理、响应解析。
   */
  async request<T = Record<string, any>>(options: KugouRequestOptions): Promise<KugouResponse<T>> {
    const cookie = { ...this.cookies.toObject(), ...(options.cookie ?? {}) };
    const dfid = cookie.dfid || '-';
    const mid = cookie.KUGOU_API_MID || this.mid;
    const uuid = '-';
    const token = cookie.token || '';
    const userid = cookie.userid || 0;
    const clienttime = Math.floor(Date.now() / 1000);
    const ip = options.realIP || options.ip || '';
    const isLite = this.isLite;

    // 1. 合并默认参数
    const defaultParams = {
      dfid,
      mid,
      uuid,
      appid: this.appid,
      clientver: this.clientver,
      clienttime,
    } as Record<string, any>;

    if (token) defaultParams.token = token;
    if (userid && userid !== '0') defaultParams.userid = userid;

    const params: Record<string, any> = options.clearDefaultParams ? { ...(options.params ?? {}) } : { ...defaultParams, ...(options.params ?? {}) };

    // 2. signKey
    if (options.encryptKey && params.hash) {
      params.key = signKey(params.hash, params.mid, params.userid, params.appid, isLite);
    }

    // 3. 序列化请求体（签名使用）
    const serializedData = Buffer.isBuffer(options.data)
      ? options.data
      : options.data && typeof options.data === 'object'
      ? JSON.stringify(options.data)
      : options.data || '';

    // 4. signature
    if (!params.signature && !options.notSignature) {
      switch (options.encryptType) {
        case 'register':
          params.signature = signatureRegisterParams(params);
          break;
        case 'web':
          params.signature = signatureWebParams(params);
          break;
        case 'android':
        default:
          params.signature = signatureAndroidParams(params, serializedData, isLite);
          break;
      }
    }

    // 5. 请求头
    const identityHeaders: Record<string, string | number> = {
      dfid,
      clienttime: params.clienttime,
      mid,
      ...INTERNAL_HEADERS,
    };
    if (ip) {
      identityHeaders['X-Real-IP'] = ip;
      identityHeaders['X-Forwarded-For'] = ip;
    }

    const headers: Record<string, string | number> = {
      'User-Agent': this.userAgent,
      ...(options.headers ?? {}),
      ...identityHeaders,
    };

    // 6. 请求配置
    const requestConfig: AxiosRequestConfig = {
      method: options.method ?? 'GET',
      baseURL: options.baseURL ?? GATEWAY,
      url: options.url,
      params,
      headers,
      timeout: options.timeout ?? this.timeout,
      responseType: options.responseType === 'arraybuffer' ? 'arraybuffer' : 'json',
      validateStatus: () => true,
      adapter: createFetchAdapter(this.fetchImpl),
    };

    if (options.data !== undefined) requestConfig.data = options.data;

    const proxyOption = options.proxy ?? this.proxy;
    const proxy = parseProxy(proxyOption);
    if (proxy) requestConfig.proxy = proxy;
    else if (proxyOption === false) requestConfig.proxy = false;

    // 7. openapicdn 接口需要把参数直接拼到 URL 上
    if (options.baseURL?.includes('openapicdn')) {
      const query = Object.keys(params)
        .map((key) => `${key}=${params[key]}`)
        .join('&');
      requestConfig.url = `${options.url}?${query}`;
      requestConfig.params = undefined;
    }

    let response: AxiosResponse;
    try {
      response = await axios.request(requestConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new KugouApiError({
        status: 502,
        body: { status: 0, msg: message },
        headers: {},
        cookie: [],
      });
    }

    // 8. 响应解析
    const responseHeaders = normalizeHeaders(response.headers);
    const setCookies = extractSetCookies(response).map(normalizeSetCookie);
    const body = parseResponseBody(response.data);

    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      const ssaCode = responseHeaders['ssa-code'] || responseHeaders['SSA-CODE'];
      if (ssaCode) body.ssaCode = ssaCode;
    }

    const failed =
      response.status >= 400 ||
      (body &&
        typeof body === 'object' &&
        !Buffer.isBuffer(body) &&
        (body.status === 0 ||
          (body.error_code !== undefined && body.error_code !== 0) ||
          // status=2 + ssaCode 表示触发风控，需要二次验证
          (body.ssaCode && body.status === 2)));

    const result: KugouResponse<T> = {
      status: failed ? 502 : 200,
      body: body as T,
      headers: responseHeaders,
      cookie: setCookies,
    };

    // 9. 自动保存 Cookie（登录态、dfid 等）
    this.cookies.absorb(setCookies);

    if (failed) throw new KugouApiError(result);
    return result;
  }

  // ----------------------------------------------------------
  // 搜索
  // ----------------------------------------------------------

  /** 搜索（歌曲 / 歌单 / 歌词 / 专辑 / 歌手 / MV） */
  search(params: SearchParams): Promise<KugouResponse> {
    const type = ['special', 'lyric', 'song', 'album', 'author', 'mv'].includes(params.type ?? 'song') ? params.type ?? 'song' : 'song';
    return this.request({
      url: `/${type === 'song' ? 'v3' : 'v1'}/search/${type}`,
      method: 'GET',
      params: {
        albumhide: 0,
        iscorrection: 1,
        keyword: params.keywords,
        nocollect: 0,
        page: params.page ?? 1,
        pagesize: params.pagesize ?? 30,
        platform: 'AndroidFilter',
      },
      encryptType: 'android',
      headers: { 'x-router': 'complexsearch.kugou.com' },
    });
  }

  /** 搜索建议 */
  searchSuggest(params: SearchSuggestParams): Promise<KugouResponse> {
    return this.request({
      url: '/v2/getSearchTip',
      method: 'GET',
      params: {
        keyword: params.keywords,
        AlbumTipCount: params.albumTipCount ?? 10,
        CorrectTipCount: params.correctTipCount ?? 10,
        MVTipCount: params.mvTipCount ?? 10,
        MusicTipCount: params.musicTipCount ?? 10,
        radiotip: 1,
      },
      encryptType: 'android',
      headers: { 'x-router': 'searchtip.kugou.com' },
    });
  }

  /** 热搜 */
  searchHot(): Promise<KugouResponse> {
    return this.request({
      url: '/api/v3/search/hot_tab',
      method: 'GET',
      params: { navid: 1, plat: 2 },
      encryptType: 'android',
      headers: { 'x-router': 'msearch.kugou.com' },
    });
  }

  /** 默认搜索词 */
  searchDefault(): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    return this.request({
      url: '/searchnofocus/v1/search_no_focus_word',
      method: 'POST',
      data: {
        plat: 0,
        userid: Number(cookie.userid || 0),
        tags: '{}',
        vip_type: cookie.vip_type || 65530,
        m_type: 0,
        own_ads: {},
        ability: '3',
        sources: [],
        bitmap: 2,
        mode: 'normal',
      },
      params: { clientver: 12329 },
      encryptType: 'android',
    });
  }

  // ----------------------------------------------------------
  // 歌词
  // ----------------------------------------------------------

  /** 歌词搜索 */
  searchLyric(params: SearchLyricParams): Promise<KugouResponse> {
    return this.request({
      baseURL: 'https://lyrics.kugou.com',
      url: '/v1/search',
      method: 'GET',
      params: {
        album_audio_id: params.albumAudioId ?? 0,
        appid: this.appid,
        clientver: this.clientver,
        duration: params.duration ?? 0,
        hash: params.hash ?? '',
        keyword: params.keywords ?? '',
        lrctxt: 1,
        man: params.man ?? 'no',
      },
      encryptType: 'android',
      clearDefaultParams: true,
    });
  }

  /** 获取歌词（可选自动解码 KRC） */
  async getLyric(params: LyricParams): Promise<KugouResponse<LyricBody>> {
    const result = await this.request<LyricBody>({
      baseURL: 'https://lyrics.kugou.com',
      url: '/download',
      method: 'GET',
      params: {
        ver: 1,
        client: params.client ?? 'android',
        id: params.id,
        accesskey: params.accesskey,
        fmt: params.fmt ?? 'krc',
        charset: 'utf8',
      },
      encryptType: 'android',
    });

    if (params.decode && result.body?.content) {
      result.body.decodeContent =
        (params.fmt ?? 'krc') === 'lrc' || Number(result.body.contenttype) !== 0
          ? Buffer.from(result.body.content, 'base64').toString('utf8')
          : decodeLyrics(result.body.content);
    }

    return result;
  }

  // ----------------------------------------------------------
  // 歌曲
  // ----------------------------------------------------------

  /**
   * 获取歌曲播放地址（支持多种音质）
   *
   * 酷狗在缺少可信 `dfid` 时会返回 `status=2` + `ssaCode`（本次请求需要验证）。
   * Client 默认会在首次调用时自动执行一次 `registerDevice()` 获取 dfid；
   * 如需完全手动控制，可设置 `autoRegisterDevice: false`。
   */
  async getSongUrl(params: SongUrlParams): Promise<KugouResponse> {
    if (this.autoRegisterDevice && !this.cookies.get('dfid')) {
      try {
        await this.ensureDevice();
      } catch {
        // 注册失败时继续尝试，由酷狗服务端决定是否返回 SSA 验证
      }
    }

    const cookie = this.cookies.toObject();
    if (!cookie.dfid) cookie.dfid = randomString(24);

    const quality = params.quality && MAGIC_QUALITIES.has(params.quality) ? `magic_${params.quality}` : params.quality ?? '128';
    const pageId = this.isLite ? 967177915 : 151369488;
    const ppageId = this.isLite ? '356753938,823673182,967485191' : '463467626,350369493,788954147';

    return this.request({
      url: '/v5/url',
      method: 'GET',
      params: {
        album_id: Number(params.albumId ?? 0),
        area_code: 1,
        hash: params.hash.toLowerCase(),
        ssa_flag: 'is_fromtrack',
        version: 11430,
        page_id: pageId,
        quality,
        album_audio_id: Number(params.albumAudioId ?? 0),
        behavior: 'play',
        pid: this.isLite ? 411 : 2,
        cmd: 26,
        pidversion: 3001,
        IsFreePart: params.freePart ? 1 : 0,
        ppage_id: ppageId,
        cdnBackup: 1,
        module: '',
        clientver: 11430,
      },
      encryptType: 'android',
      encryptKey: true,
      headers: { 'x-router': 'trackercdn.kugou.com' },
      cookie,
    });
  }

  /** 批量获取歌曲信息 */
  getSongs(hashes: string | string[]): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    const clienttime = Date.now();
    const list = (Array.isArray(hashes) ? hashes : hashes.split(',')).map((hash) => ({ hash, audio_id: 0 }));

    const data: Record<string, any> = {
      appid: this.appid,
      clienttime,
      clientver: this.clientver,
      data: list,
      dfid: cookie.dfid || '-',
      key: signParamsKey(clienttime, this.appid, this.clientver, this.isLite),
      mid: cookie.KUGOU_API_MID || this.mid,
    };
    if (cookie.token) data.token = cookie.token;
    if (cookie.userid) data.userid = cookie.userid;

    return this.request({
      baseURL: 'http://kmr.service.kugou.com',
      url: '/v1/audio/audio',
      method: 'POST',
      data,
      encryptType: 'android',
      headers: { 'x-router': 'kmr.service.kugou.com', 'Content-Type': 'application/json' },
    });
  }

  /** 批量获取歌曲权限 / 音质信息 */
  getSongPrivilege(params: SongPrivilegeParams): Promise<KugouResponse> {
    const hashes = Array.isArray(params.hashes) ? params.hashes : params.hashes.split(',');
    const albumIds = params.albumIds === undefined ? [] : Array.isArray(params.albumIds) ? params.albumIds : String(params.albumIds).split(',');
    const resource = hashes.map((hash, index) => ({
      type: 'audio',
      page_id: 0,
      hash,
      album_id: Number(albumIds[index] ?? 0),
    }));

    return this.request({
      url: '/v2/get_res_privilege/lite',
      method: 'POST',
      data: {
        appid: this.appid,
        area_code: 1,
        behavior: 'play',
        clientver: this.clientver,
        need_hash_offset: 1,
        relate: 1,
        support_verify: 1,
        resource,
        qualities: ['128', '320', 'flac', 'high', 'viper_atmos', 'viper_tape', 'viper_clear', 'super', 'multitrack'],
      },
      encryptType: 'android',
      headers: { 'x-router': 'media.store.kugou.com', 'Content-Type': 'application/json' },
    });
  }

  // ----------------------------------------------------------
  // 歌单
  // ----------------------------------------------------------

  /** 歌单详情 */
  getPlaylistDetail(params: PlaylistDetailParams): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    const ids = Array.isArray(params.ids) ? params.ids : params.ids.split(',');
    return this.request({
      url: '/v3/get_list_info',
      method: 'POST',
      data: {
        data: ids.map((id) => ({ global_collection_id: id.trim() })),
        userid: cookie.userid || 0,
        token: cookie.token || '',
      },
      encryptType: 'android',
      headers: { 'x-router': 'pubsongs.kugou.com' },
    });
  }

  /** 歌单全部歌曲 */
  getPlaylistTracks(params: PlaylistTracksParams): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    return this.request({
      url: '/v4/get_list_all_file',
      method: 'POST',
      data: {
        listid: params.listid,
        userid: cookie.userid || '0',
        area_code: 1,
        show_relate_goods: 0,
        pagesize: params.pagesize ?? 30,
        allplatform: 1,
        show_cover: 1,
        type: 0,
        token: cookie.token || '0',
        page: params.page ?? 1,
      },
      encryptType: 'android',
      headers: { 'x-router': 'cloudlist.service.kugou.com' },
    });
  }

  /** 歌单分类 */
  getPlaylistTags(): Promise<KugouResponse> {
    return this.request({
      url: '/pubsongs/v1/get_tags_by_type',
      method: 'POST',
      data: { tag_type: 'collection', tag_id: 0, source: 3 },
      encryptType: 'android',
    });
  }

  /** 推荐歌单 */
  getTopPlaylists(params: TopPlaylistParams = {}): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    const clienttime = (Date.now() / 1000).toFixed(0);
    return this.request({
      url: '/v2/special_recommend',
      method: 'POST',
      data: {
        appid: this.appid,
        mid: cookie.KUGOU_API_MID || this.mid,
        clientver: this.clientver,
        platform: 'android',
        clienttime,
        userid: cookie.userid || 0,
        module_id: params.moduleId ?? 1,
        page: params.page ?? 1,
        pagesize: params.pagesize ?? 30,
        key: signParamsKey(clienttime, this.appid, this.clientver, this.isLite),
        special_recommend: {
          withtag: params.withtag ?? 1,
          withsong: params.withsong ?? 1,
          sort: params.sort ?? 1,
          ugc: 1,
          is_selected: 0,
          withrecommend: 1,
          area_code: 1,
          categoryid: params.categoryId ?? 0,
        },
        req_multi: 1,
        retrun_min: 5,
        return_special_falg: 1,
      },
      encryptType: 'android',
      headers: { 'x-router': 'specialrec.service.kugou.com' },
    });
  }

  // ----------------------------------------------------------
  // 专辑
  // ----------------------------------------------------------

  /** 专辑详情 */
  getAlbumDetail(params: AlbumDetailParams): Promise<KugouResponse> {
    return this.request({
      url: '/kmr/v2/albums',
      method: 'POST',
      data: {
        data: [{ album_id: params.albumId }],
        is_buy: params.isBuy ?? 0,
        fields:
          params.fields ??
          'album_id,album_name,publish_date,sizable_cover,intro,language,is_publish,heat,type,quality,authors,exclusive,author_name,trans_param',
      },
      encryptType: 'android',
      headers: { 'x-router': 'openapi.kugou.com', 'kg-tid': '255' },
    });
  }

  /** 专辑歌曲列表 */
  getAlbumSongs(params: AlbumSongsParams): Promise<KugouResponse> {
    return this.request({
      url: '/v1/album_audio/lite',
      method: 'POST',
      data: {
        album_id: params.albumId,
        is_buy: params.isBuy ?? '',
        page: params.page ?? 1,
        pagesize: params.pagesize ?? 30,
      },
      encryptType: 'android',
      headers: { 'x-router': 'openapi.kugou.com', 'kg-tid': '255' },
    });
  }

  /** 批量获取专辑基础信息 */
  getAlbums(params: AlbumsParams): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    const clienttime = Date.now();
    const ids = Array.isArray(params.albumIds) ? params.albumIds : String(params.albumIds).split(',');

    const data: Record<string, any> = {
      appid: this.appid,
      clienttime,
      clientver: this.clientver,
      data: ids.map((albumId) => ({ album_id: albumId, album_name: '', author_name: '' })),
      dfid: cookie.dfid || '-',
      fields: params.fields ?? '',
      key: signParamsKey(clienttime, this.appid, this.clientver, this.isLite),
      mid: cookie.KUGOU_API_MID || this.mid,
    };
    if (cookie.token) data.token = cookie.token;
    if (cookie.userid) data.userid = cookie.userid;

    return this.request({
      baseURL: 'http://kmr.service.kugou.com',
      url: '/v1/album',
      method: 'POST',
      data,
      encryptType: 'android',
      headers: { 'x-router': 'kmr.service.kugou.com', 'Content-Type': 'application/json' },
    });
  }

  // ----------------------------------------------------------
  // 歌手
  // ----------------------------------------------------------

  /** 歌手详情 */
  getArtistDetail(id: string | number): Promise<KugouResponse> {
    return this.request({
      url: '/kmr/v3/author',
      method: 'POST',
      data: { author_id: id },
      encryptType: 'android',
      headers: { 'x-router': 'openapi.kugou.com', 'kg-tid': 36 },
    });
  }

  /** 歌手单曲 */
  getArtistSongs(params: ArtistSongsParams): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    const clienttime = Math.floor(Date.now() / 1000);
    return this.request({
      baseURL: 'https://openapi.kugou.com',
      url: '/kmr/v1/audio_group/author',
      method: 'POST',
      data: {
        appid: this.appid,
        clientver: this.clientver,
        mid: cookie.KUGOU_API_MID || this.mid,
        clienttime,
        key: signParamsKey(clienttime, this.appid, this.clientver, this.isLite),
        author_id: params.id,
        pagesize: params.pagesize ?? 30,
        page: params.page ?? 1,
        sort: params.sort === 'hot' ? 1 : 2,
        area_code: 'all',
      },
      encryptType: 'android',
      headers: { 'x-router': 'openapi.kugou.com', 'kg-tid': 220 },
    });
  }

  /** 歌手专辑 */
  getArtistAlbums(params: ArtistAlbumsParams): Promise<KugouResponse> {
    return this.request({
      url: '/kmr/v1/author/albums',
      method: 'POST',
      data: {
        author_id: params.id,
        pagesize: params.pagesize ?? 30,
        page: params.page ?? 1,
        sort: params.sort === 'hot' ? 3 : 1,
        category: 1,
        area_code: 'all',
      },
      encryptType: 'android',
      headers: { 'x-router': 'openapi.kugou.com', 'kg-tid': 36 },
    });
  }

  // ----------------------------------------------------------
  // 排行榜
  // ----------------------------------------------------------

  /** 排行榜列表 */
  getRankList(params: RankListParams = {}): Promise<KugouResponse> {
    return this.request({
      url: '/ocean/v6/rank/list',
      method: 'GET',
      params: { plat: 2, withsong: params.withsong ?? 1, parentid: 0 },
      encryptType: 'android',
    });
  }

  /** 排行榜详情 */
  getRankInfo(params: RankInfoParams): Promise<KugouResponse> {
    return this.request({
      url: '/ocean/v6/rank/info',
      method: 'GET',
      params: {
        rank_cid: params.rankCid ?? 0,
        rankid: params.rankid,
        with_album_img: params.albumImg ?? 1,
        zone: params.zone ?? '',
      },
      encryptType: 'android',
    });
  }

  /** 排行榜歌曲 */
  getRankSongs(params: RankSongsParams): Promise<KugouResponse> {
    return this.request({
      url: '/openapi/kmr/v2/rank/audio',
      method: 'POST',
      data: {
        show_portrait_mv: 1,
        show_type_total: 1,
        filter_original_remarks: 1,
        area_code: 1,
        pagesize: params.pagesize ?? 30,
        rank_cid: params.rankCid ?? 0,
        type: 1,
        page: params.page ?? 1,
        rank_id: params.rankid,
      },
      encryptType: 'android',
      headers: { 'kg-tid': '369' },
    });
  }

  // ----------------------------------------------------------
  // 推荐 / FM / 新歌
  // ----------------------------------------------------------

  /** 每日推荐歌曲 */
  getDailyRecommend(params: DailyRecommendParams = {}): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    return this.request({
      url: '/everyday_song_recommend',
      method: 'POST',
      data: {
        platform: params.platform ?? 'android',
        userid: params.userid ?? cookie.userid ?? '0',
      },
      encryptType: 'android',
      headers: { 'x-router': 'everydayrec.service.kugou.com' },
    });
  }

  /** 私人 FM */
  getPersonalFm(params: PersonalFmParams = {}): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    const clienttime = Date.now();
    const userid = params.userid ?? cookie.userid ?? 0;
    const token = cookie.token || 0;
    const vipType = cookie.vip_type || 0;

    const data: Record<string, any> = {
      appid: this.appid,
      clienttime,
      mid: cookie.KUGOU_API_MID || this.mid,
      action: params.action ?? 'play',
      recommend_source_locked: 0,
      song_pool_id: Number(params.songPoolId ?? 0),
      callerid: 0,
      m_type: 1,
      platform: params.platform ?? 'ios',
      area_code: 1,
      remain_songcnt: Number(params.remainSongcnt ?? 0),
      clientver: this.clientver,
      is_overplay: params.isOverplay ? 1 : 0,
      mode: params.mode ?? 'normal',
      fakem: 'ca981cfc583a4c37f28d2d49000013c16a0a',
      key: signParamsKey(clienttime, this.appid, this.clientver, this.isLite),
    };

    if (userid) {
      data.userid = userid;
      data.kguid = userid;
    }
    if (token) data.token = token;
    if (vipType) data.vip_type = vipType;
    if (params.hash) data.hash = params.hash;
    if (params.songid !== undefined) data.songid = params.songid;
    if (params.playtime !== undefined) data.playtime = params.playtime;

    return this.request({
      url: '/v2/personal_recommend',
      method: 'POST',
      data,
      encryptType: 'android',
      headers: { 'x-router': 'persnfm.service.kugou.com' },
    });
  }

  /** 新歌速递 */
  getNewSongs(params: NewSongsParams = {}): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    return this.request({
      url: '/musicadservice/container/v1/newsong_publish',
      method: 'POST',
      data: {
        rank_id: params.type ?? 21608,
        userid: params.userid ?? cookie.userid ?? 0,
        page: params.page ?? 1,
        pagesize: params.pagesize ?? 30,
        tags: [],
      },
      encryptType: 'android',
    });
  }

  // ----------------------------------------------------------
  // 用户
  // ----------------------------------------------------------

  /** 当前登录用户信息 */
  getUserDetail(): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    const token = cookie.token || '';
    const userid = Number(cookie.userid || 0);
    const visitTime = Math.floor(Date.now() / 1000);
    const p = rsaEncryptNoPadding(Buffer.from(JSON.stringify({ token, clienttime: visitTime }), 'utf8'), this.publicKey()).toUpperCase();

    return this.request({
      url: '/v3/get_my_info',
      method: 'POST',
      data: { visit_time: visitTime, usertype: 1, p, userid },
      params: { plat: 1 },
      encryptType: 'android',
      headers: { 'x-router': 'usercenter.kugou.com' },
    });
  }

  /** 当前登录用户的歌单 */
  getUserPlaylists(params: UserPlaylistsParams = {}): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    const userid = cookie.userid || 0;
    const token = cookie.token || '';

    return this.request({
      url: '/v7/get_all_list',
      method: 'POST',
      data: {
        userid,
        token,
        total_ver: 979,
        type: 2,
        page: params.page ?? 1,
        pagesize: params.pagesize ?? 30,
      },
      params: { plat: 1, userid: Number(userid), token },
      encryptType: 'android',
      headers: { 'x-router': 'cloudlist.service.kugou.com' },
    });
  }

  // ----------------------------------------------------------
  // 登录 / 设备
  // ----------------------------------------------------------

  /** 发送手机验证码 */
  sendCaptcha(params: CaptchaParams): Promise<KugouResponse> {
    return this.request({
      baseURL: 'http://login.user.kugou.com',
      url: '/v7/send_mobile_code',
      method: 'POST',
      data: { businessid: 5, mobile: String(params.mobile), plat: 3 },
      encryptType: 'android',
      cookie: { mid: this.mid },
    });
  }

  /** 获取扫码登录的二维码 key（qrcode_img 为可直接展示的图片） */
  loginQrKey(params: { type?: 'web' } = {}): Promise<KugouResponse> {
    return this.request({
      baseURL: 'https://login-user.kugou.com',
      url: '/v2/qrcode',
      method: 'GET',
      params: {
        appid: params.type === 'web' ? 1014 : 1001,
        type: 1,
        plat: 4,
        qrcode_txt: `https://h5.kugou.com/apps/loginQRCode/html/index.html?appid=${this.appid}&`,
        srcappid: 2919,
      },
      encryptType: 'web',
    });
  }

  /**
   * 轮询扫码状态：0 过期 / 1 等待扫码 / 2 待确认 / 4 登录成功。
   * 成功后自动保存 token / userid。
   */
  async loginQrCheck(key: string): Promise<KugouResponse> {
    const result = await this.request({
      baseURL: 'https://login-user.kugou.com',
      url: '/v2/get_userinfo_qrcode',
      method: 'GET',
      params: { plat: 4, appid: this.appid, srcappid: 2919, qrcode: key },
      encryptType: 'web',
    });
    const body: any = result.body;
    if (body?.data?.status == 4) {
      const extra = [`token=${body.data.token}`, `userid=${body.data.userid}`];
      result.cookie = [...(result.cookie ?? []), ...extra];
      this.cookies.absorb(extra);
    }
    return result;
  }

  /** 手机验证码登录（成功后自动保存 token / userid / vip 信息） */
  async loginCellphone(params: LoginCellphoneParams): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    const dateTime = Date.now();
    const encrypt = aesEncryptWithRandomKey({ mobile: params.mobile || '', code: params.code || '' });
    const mobile = params.mobile && `${String(params.mobile).substring(0, 2)}*****${String(params.mobile).substring(10, 11)}`;
    const dfid = cookie.dfid ?? randomString(24);
    const t2 = aesCbcEncrypt(
      `${cookie.KUGOU_API_GUID}|0f607264fc6318a92b9e13c65db7cd3c|${cookie.KUGOU_API_MAC}|${cookie.KUGOU_API_DEV}|${dateTime}`,
      LITE_T2.key,
      LITE_T2.iv,
      'hex'
    );
    const t1 = aesCbcEncrypt(`|${dateTime}`, LITE_T1.key, LITE_T1.iv, 'hex');

    const data: Record<string, any> = {
      plat: 1,
      support_multi: 1,
      t1: this.isLite ? t1 : 0,
      t2: this.isLite ? t2 : 0,
      clienttime_ms: dateTime,
      mobile,
      key: signParamsKey(dateTime, this.appid, this.clientver, this.isLite),
      pk: rsaEncryptNoPadding(Buffer.from(JSON.stringify({ clienttime_ms: dateTime, key: encrypt.key }), 'utf8'), this.publicKey()).toUpperCase(),
      params: encrypt.str,
    };

    if (params.userid) data.userid = params.userid;

    if (this.isLite) {
      data.dfid = dfid;
      data.dev = cookie.KUGOU_API_DEV;
      data.gitversion = '5f0b7c4';
    } else {
      data.t3 = 'MCwwLDAsMCwwLDAsMCwwLDA=';
    }

    const result = await this.request({
      baseURL: 'https://loginserviceretry.kugou.com',
      url: '/v7/login_by_verifycode',
      method: 'POST',
      data,
      encryptType: 'android',
      headers: {
        'support-calm': '1',
        'User-Agent': 'Android16-1070-11440-130-0-LOGIN-wifi',
      },
    });

    const body = result.body as Record<string, any>;
    const extraCookies: string[] = [];

    if (body?.status === 1 && body?.data?.secu_params) {
      const decrypted = aesDecryptWithKey(body.data.secu_params, encrypt.key);
      if (typeof decrypted === 'object' && decrypted !== null) {
        body.data = { ...body.data, ...(decrypted as Record<string, any>) };
        for (const [key, value] of Object.entries(decrypted as Record<string, any>)) {
          extraCookies.push(`${key}=${value}`);
        }
      } else {
        body.data.token = decrypted;
        extraCookies.push(`token=${decrypted}`);
      }
    }

    if (body?.data) {
      const keys = ['t1', 'token', 'userid', 'vip_type', 'vip_token'];
      for (const key of keys) {
        if (body.data[key] !== undefined) extraCookies.push(`${key}=${body.data[key]}`);
      }
    }

    this.applyCookies(result, extraCookies);
    return result;
  }

  /**
   * 注册设备，获取 dfid
   *
   * 返回体为加密二进制，SDK 会自动解密后返回 JSON。
   * 成功后自动保存 `dfid` Cookie。
   */
  async registerDevice(): Promise<KugouResponse> {
    const cookie = this.cookies.toObject();
    const userid = cookie.userid || 0;
    const token = cookie.token || '';

    const dataMap: Record<string, any> = {
      availableRamSize: 4983533568,
      availableRomSize: 48114719,
      availableSDSize: 48114717,
      basebandVer: '',
      batteryLevel: 100,
      batteryStatus: 3,
      brand: 'Redmi',
      buildSerial: 'unknown',
      device: 'marble',
      imei: cookie.KUGOU_API_GUID,
      imsi: '',
      manufacturer: 'Xiaomi',
      uuid: cookie.KUGOU_API_GUID,
      accelerometer: false,
      accelerometerValue: '',
      gravity: false,
      gravityValue: '',
      gyroscope: false,
      gyroscopeValue: '',
      light: false,
      lightValue: '',
      magnetic: false,
      magneticValue: '',
      orientation: false,
      orientationValue: '',
      pressure: false,
      pressureValue: '',
      step_counter: false,
      step_counterValue: '',
      temperature: false,
      temperatureValue: '',
    };

    const aes = playlistAesEncrypt(dataMap);
    const p = rsaEncryptPkcs1(Buffer.from(JSON.stringify({ aes: aes.key, uid: userid, token }), 'utf8'), this.publicKey());

    const result = await this.request({
      baseURL: 'https://userservice.kugou.com',
      url: '/risk/v2/r_register_dev',
      method: 'POST',
      data: aes.str,
      params: { part: 1, platid: 1, p },
      encryptType: 'android',
      responseType: 'arraybuffer',
    });

    const raw = result.body as unknown;
    const base64 = Buffer.isBuffer(raw) ? raw.toString('base64') : Buffer.from(String(raw), 'utf8').toString('base64');
    const decrypted = playlistAesDecrypt(base64, aes.key) as Record<string, any>;

    result.body = decrypted;
    const extraCookies: string[] = [];
    if (decrypted?.status === 1 && decrypted?.data?.dfid) {
      extraCookies.push(`dfid=${decrypted.data.dfid}`);
    }
    this.applyCookies(result, extraCookies);

    return result;
  }

  // ----------------------------------------------------------
  // 内部辅助
  // ----------------------------------------------------------

  private publicKey(): string {
    return this.isLite ? LITE_PUBLIC_KEY : PUBLIC_KEY;
  }

  /** 确保设备已注册（并发调用只执行一次） */
  private ensureDevice(): Promise<void> {
    if (this.cookies.get('dfid')) return Promise.resolve();
    if (!this.deviceReady) {
      this.deviceReady = this.registerDevice()
        .then(() => undefined)
        .catch((error) => {
          this.deviceReady = undefined;
          throw error;
        });
    }
    return this.deviceReady;
  }

  private applyCookies(result: KugouResponse<any>, extra: string[]): void {
    if (extra.length === 0) return;
    result.cookie = [...(result.cookie ?? []), ...extra];
    this.cookies.absorb(extra);
  }
}

/**
 * 底层加密工具（高级用法）
 *
 * 与旧版 `util/crypto.js` 的输出保持一致，便于迁移或自定义接口。
 */
export const cryptoUtils = {
  /** 随机 key 的 AES-256-CBC 加密，返回 hex 与 key */
  aesEncryptWithRandomKey,
  /** 使用原始 key 解密 AES（自动处理 MD5 派生 key/iv） */
  aesDecryptWithKey,
  /** 无填充 RSA 加密（hex，用于 pk 参数） */
  rsaEncryptNoPadding,
  /** PKCS#1 v1.5 RSA 加密（hex） */
  rsaEncryptPkcs1,
  /** 歌单 / 设备注册 AES 加密（Base64） */
  playlistAesEncrypt,
  /** 歌单 / 设备注册 AES 解密 */
  playlistAesDecrypt,
};

export default KugouClient;
