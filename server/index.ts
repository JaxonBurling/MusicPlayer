/**
 * @fileoverview 本地音乐 API 服务
 *
 * 在 Node 进程中加载 src/kugou 与 src/wyy 两个库，向前端暴露统一的调用入口：
 *
 *   POST /call
 *   body: { source: 'kugou' | 'netease', module: string, query: object }
 *   resp: { status, body, cookie }
 *
 * 服务同时负责两端的设备/会话引导：
 * - 酷狗：生成并持久化 GUID/MID/DEV/MAC/WebGL，必要时调用 register_dev 获取 dfid
 * - 网易云：持久化 xeapi 公钥与匿名 token（供 util/request 使用）
 *
 * 运行：pnpm server  （需要 tsx）
 */

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 必须最先加载：设置酷狗概念版（youth/lite）等运行时环境
import './env';

// ==================== 请求函数 ====================
import { createRequest as kugouRequest } from '../src/kugou/util/request';
import {
  calculateMid,
  cookieToJson,
} from '../src/kugou/util';
import { generateWebGLHash, getGuid, randomString } from '../src/kugou/util/util';
import wyyRequest from '../src/wyy/util/request';

// ==================== 酷狗模块 ====================
import kugouSearch from '../src/kugou/module/search';
import kugouSongUrl from '../src/kugou/module/song_url';
import kugouLoginQrKey from '../src/kugou/module/login_qr_key';
import kugouLoginQrCreate from '../src/kugou/module/login_qr_create';
import kugouLoginQrCheck from '../src/kugou/module/login_qr_check';
import kugouCaptchaSent from '../src/kugou/module/captcha_sent';
import kugouLoginCellphone from '../src/kugou/module/login_cellphone';
import kugouUserDetail from '../src/kugou/module/user_detail';
import kugouUserPlaylist from '../src/kugou/module/user_playlist';
import kugouPlaylistTrackAll from '../src/kugou/module/playlist_track_all';
import kugouRegisterDev from '../src/kugou/module/register_dev';

// ==================== 网易云模块 ====================
import wyyCloudsearch from '../src/wyy/module/cloudsearch';
import wyySongUrlV1 from '../src/wyy/module/song_url_v1';
import wyyLyric from '../src/wyy/module/lyric';
import wyyLoginQrKey from '../src/wyy/module/login_qr_key';
import wyyLoginQrCreate from '../src/wyy/module/login_qr_create';
import wyyLoginQrCheck from '../src/wyy/module/login_qr_check';
import wyyCaptchaSent from '../src/wyy/module/captcha_sent';
import wyyLoginCellphone from '../src/wyy/module/login_cellphone';
import wyyUserAccount from '../src/wyy/module/user_account';
import wyyUserPlaylist from '../src/wyy/module/user_playlist';
import wyyPlaylistTrackAll from '../src/wyy/module/playlist_track_all';
import wyyLikelist from '../src/wyy/module/likelist';
import wyySongDetail from '../src/wyy/module/song_detail';

const PORT = Number(process.env.MUSIC_API_PORT || 3080);
const HOST = process.env.MUSIC_API_HOST || '127.0.0.1';

// ============================================================
// 通用工具
// ============================================================

/** 读取请求体 */
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

/** 发送 JSON 响应 */
function sendJson(res: http.ServerResponse, status: number, data: any): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

/** cookie 字符串数组转对象 */
function mergeCookieStrings(target: Record<string, string>, cookies: string[]): void {
  for (const c of cookies || []) {
    const idx = c.indexOf('=');
    if (idx <= 0) continue;
    target[c.slice(0, idx).trim()] = c.slice(idx + 1).trim();
  }
}

// ============================================================
// 酷狗设备上下文
// ============================================================

interface KugouDevice {
  guid: string;
  mid: string;
  dev: string;
  mac: string;
  webgl: string;
  dfid: string;
}

const DATA_DIR = path.join(os.homedir(), '.musicplayer');
const DEVICE_FILE = path.join(DATA_DIR, 'kugou-device.json');

function loadDevice(): KugouDevice {
  let saved: Partial<KugouDevice> = {};
  try {
    if (fs.existsSync(DEVICE_FILE)) {
      saved = JSON.parse(fs.readFileSync(DEVICE_FILE, 'utf-8'));
    }
  } catch {
    saved = {};
  }

  const guid = saved.guid || getGuid();
  const device: KugouDevice = {
    guid,
    mid: saved.mid || calculateMid(guid),
    dev: saved.dev || randomString(32),
    mac: saved.mac || randomHex(12).toUpperCase(),
    webgl: saved.webgl || generateWebGLHash(),
    dfid: saved.dfid || '',
  };
  saveDevice(device);
  return device;
}

function saveDevice(device: KugouDevice): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DEVICE_FILE, JSON.stringify(device, null, 2));
  } catch (e) {
    console.warn('[server] 保存酷狗设备信息失败:', e);
  }
}

function randomHex(len: number): string {
  let out = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}

let device = loadDevice();

/** 组合酷狗请求 cookie：客户端 cookie + 设备标识 */
function kugouCookie(clientCookie: any): Record<string, any> {
  const cookie: Record<string, any> =
    typeof clientCookie === 'string'
      ? cookieToJson(clientCookie)
      : { ...(clientCookie || {}) };
  cookie.KUGOU_API_GUID = cookie.KUGOU_API_GUID || device.guid;
  cookie.KUGOU_API_MID = cookie.KUGOU_API_MID || device.mid;
  cookie.KUGOU_API_DEV = cookie.KUGOU_API_DEV || device.dev;
  cookie.KUGOU_API_MAC = cookie.KUGOU_API_MAC || device.mac;
  cookie.KUGOU_API_WEBGL = cookie.KUGOU_API_WEBGL || device.webgl;
  if (device.dfid) cookie.dfid = cookie.dfid || device.dfid;
  return cookie;
}

/** 确保已获取 dfid（部分接口必须） */
async function ensureDfid(): Promise<void> {
  if (device.dfid) return;
  try {
    const res: any = await kugouRegisterDev(
      { cookie: kugouCookie({}) },
      kugouRequest,
    );
    const dfid = res?.body?.data?.dfid;
    if (dfid) {
      device.dfid = dfid;
      saveDevice(device);
    }
  } catch (e) {
    console.warn('[server] 获取酷狗 dfid 失败（可稍后重试）:', e);
  }
}

// ============================================================
// 网易云引导（xeapi 公钥 + 匿名 token）
// ============================================================

async function ensureWyyBootstrap(): Promise<void> {
  const keyPath = path.join(os.tmpdir(), 'xeapi_public_key');
  if (fs.existsSync(keyPath)) return;

  try {
    const deviceId = randomHex(52).toUpperCase();
    (global as any).deviceId = deviceId;

    const { getXeapiPublicKey } = await import('../src/wyy/util/xeapiKey');
    const publicKey = await getXeapiPublicKey({}, deviceId);
    fs.writeFileSync(keyPath, JSON.stringify(publicKey));

    const registerAnonimous = (await import('../src/wyy/module/register_anonimous')).default;
    const res: any = await registerAnonimous({}, wyyRequest);
    if (res?.cookie?.length) {
      fs.writeFileSync(
        path.join(os.tmpdir(), 'anonymous_token'),
        res.cookie.join(';'),
      );
    }
    console.log('[server] 网易云引导完成');
  } catch (e) {
    console.warn('[server] 网易云引导失败，相关接口可能不可用:', e);
  }
}

// ============================================================
// 模块注册表
// ============================================================

const kugouModules: Record<string, any> = {
  search: kugouSearch,
  song_url: kugouSongUrl,
  login_qr_key: kugouLoginQrKey,
  login_qr_create: kugouLoginQrCreate,
  login_qr_check: kugouLoginQrCheck,
  captcha_sent: kugouCaptchaSent,
  login_cellphone: kugouLoginCellphone,
  user_detail: kugouUserDetail,
  user_playlist: kugouUserPlaylist,
  playlist_track_all: kugouPlaylistTrackAll,
};

const wyyModules: Record<string, any> = {
  cloudsearch: wyyCloudsearch,
  song_url_v1: wyySongUrlV1,
  lyric: wyyLyric,
  login_qr_key: wyyLoginQrKey,
  login_qr_create: wyyLoginQrCreate,
  login_qr_check: wyyLoginQrCheck,
  captcha_sent: wyyCaptchaSent,
  login_cellphone: wyyLoginCellphone,
  user_account: wyyUserAccount,
  user_playlist: wyyUserPlaylist,
  playlist_track_all: wyyPlaylistTrackAll,
  likelist: wyyLikelist,
  song_detail: wyySongDetail,
};

// ============================================================
// 调用处理
// ============================================================

async function callKugou(moduleName: string, query: Record<string, any>) {
  const mod = kugouModules[moduleName];
  if (!mod) throw new Error(`未知的酷狗接口: ${moduleName}`);

  await ensureDfid();

  const params = { ...query, cookie: kugouCookie(query.cookie) };
  let result: any;
  try {
    result = await mod(params, kugouRequest);
  } catch (e: any) {
    result = e && typeof e === 'object' ? e : { status: 502, body: { msg: String(e) } };
  }

  // 合并返回的 cookie，持久化登录态/dfid
  const cookies: string[] = Array.isArray(result?.cookie) ? result.cookie : [];
  const merged: Record<string, string> = {};
  mergeCookieStrings(merged, cookies);
  let changed = false;
  if (merged.dfid && merged.dfid !== device.dfid) {
    device.dfid = merged.dfid;
    changed = true;
  }
  if (changed) saveDevice(device);

  return {
    status: result?.status ?? 200,
    body: result?.body ?? result,
  };
}

async function callWyy(moduleName: string, query: Record<string, any>) {
  const mod = wyyModules[moduleName];
  if (!mod) throw new Error(`未知的网易云接口: ${moduleName}`);

  await ensureWyyBootstrap();

  try {
    const result = await mod(query, wyyRequest);
    return {
      status: result?.status ?? 200,
      body: result?.body ?? result,
    };
  } catch (e: any) {
    if (e && typeof e === 'object' && ('body' in e || 'status' in e)) {
      return { status: e.status ?? 502, body: e.body ?? e };
    }
    return { status: 500, body: { code: 500, msg: String(e?.message || e) } };
  }
}

// ============================================================
// HTTP 服务
// ============================================================

const server = http.createServer(async (req, res) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${HOST}`);

  if (url.pathname === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === '/call' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const { source, module: moduleName, query = {} } = payload;

      let result;
      if (source === 'kugou') result = await callKugou(moduleName, query);
      else if (source === 'netease') result = await callWyy(moduleName, query);
      else throw new Error(`未知音源: ${source}`);

      const status = Number(result?.status) || 200;
      sendJson(
        res,
        status >= 100 && status < 600 ? status : 200,
        result?.body ?? result,
      );
    } catch (e: any) {
      sendJson(res, 200, {
        code: 500,
        msg: e?.message || String(e),
      });
    }
    return;
  }

  sendJson(res, 404, { code: 404, msg: 'Not Found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[server] 本地音乐 API 已启动: http://${HOST}:${PORT}`);
});

export default server;
