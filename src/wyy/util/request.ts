/**
 * @fileoverview 网易云音乐 API HTTP 请求封装
 *
 * 负责构建加密参数、Cookie、请求头，并通过 axios 发送请求与解密响应。
 *
 * @module util/request
 * @requires axios
 * @requires ./crypto
 * @requires ./index
 * @requires ./config.json
 */

import encrypt from './crypto';
import CryptoJS from './cryptojs';
import axios from 'axios';
import { PacProxyAgent } from 'pac-proxy-agent';
import http from 'http';
import https from 'https';
import tunnel from 'tunnel';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  cookieToJson,
  cookieObjToString,
  toBoolean,
} from './index';
import config from './config.json';
import type { WyyResponse } from './types';

const { APP_CONF } = config;
const tmpPath = os.tmpdir();

// 预先读取匿名token并缓存（文件可能尚未生成，延迟读取）
const anonymousTokenPath = path.resolve(tmpPath, './anonymous_token');
let anonymous_token = '';
const getAnonymousToken = (): string => {
  if (!anonymous_token && fs.existsSync(anonymousTokenPath)) {
    try {
      anonymous_token = fs.readFileSync(anonymousTokenPath, 'utf-8');
    } catch (error) {
      console.log('[ERR]', error);
    }
  }
  return anonymous_token;
};
const xeapiPublicKeyPath = path.resolve(tmpPath, './xeapi_public_key');
let xeapi_public_key: any = null;
const loadXeapiPublicKey = (): any => {
  if (!xeapi_public_key && fs.existsSync(xeapiPublicKeyPath)) {
    try {
      xeapi_public_key = JSON.parse(
        fs.readFileSync(xeapiPublicKeyPath, 'utf-8'),
      );
    } catch (error) {
      console.log('[ERR]', error);
    }
  }
  return xeapi_public_key;
};

// 预先绑定常用函数和常量
const floor = Math.floor;
const random = Math.random;
const now = Date.now;
const keys = Object.keys;
const parse = JSON.parse;
const characters = 'abcdefghijklmnopqrstuvwxyz';
const charactersLength = characters.length;

// 预先创建HTTP/HTTPS agents并重用
const createHttpAgent = () => new http.Agent({ keepAlive: true });
const createHttpsAgent = () => new https.Agent({ keepAlive: true });

// 预先计算WNMCID（只计算一次）
const WNMCID = (function () {
  let randomString = '';
  for (let i = 0; i < 6; i++) {
    randomString += characters.charAt(floor(random() * charactersLength));
  }
  return `${randomString}.${now().toString()}.01.0`;
})();

/** 系统信息映射 */
const osMap: Record<string, Record<string, string>> = {
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
};

/** UA 映射 */
const userAgentMap: Record<string, Record<string, string>> = {
  weapi: {
    pc: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  },
  linuxapi: {
    linux:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
  },
  api: {
    pc: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/3.0.18.203152',
    android:
      'NeteaseMusic/9.1.65.240927161425(9001065);Dalvik/2.1.0 (Linux; U; Android 14; 23013RK75C Build/UKQ1.230804.001)',
    iphone: 'NeteaseMusic 9.0.90/5038 (iPhone; iOS 16.2; zh_CN)',
  },
};

// 预先定义常量
const DOMAIN = APP_CONF.domain;
const API_DOMAIN = APP_CONF.apiDomain;
const XEAPI_DOMAIN = APP_CONF.xeapiDomain;
const ENCRYPT_RESPONSE = APP_CONF.encryptResponse;
const SPECIAL_STATUS_CODES = new Set([201, 302, 400, 502, 800, 801, 802, 803]);

let xeapiSessionId = '';
let xeapiSessionKey = '';

/** 选择 User-Agent */
const chooseUserAgent = (crypto: string, uaType = 'pc'): string => {
  return (userAgentMap[crypto] && userAgentMap[crypto][uaType]) || '';
};

/** cookie处理 */
const processCookieObject = (
  cookie: Record<string, any>,
  uri: string,
): Record<string, any> => {
  const _ntes_nuid = CryptoJS.lib.WordArray.random(32).toString();
  const os = osMap[cookie.os] || osMap['pc'];

  const processedCookie: Record<string, any> = {
    ...cookie,
    __remember_me: 'true',
    ntes_kaola_ad: '1',
    _ntes_nuid: cookie._ntes_nuid || _ntes_nuid,
    _ntes_nnid: cookie._ntes_nnid || `${_ntes_nuid},${now().toString()}`,
    WNMCID: cookie.WNMCID || WNMCID,
    WEVNSM: cookie.WEVNSM || '1.0.0',
    osver: cookie.osver || os.osver,
    deviceId: cookie.deviceId || (global as any).deviceId,
    os: cookie.os || os.os,
    channel: cookie.channel || os.channel,
    appver: cookie.appver || os.appver,
  };

  if (uri.indexOf('login') === -1) {
    processedCookie['NMTID'] = CryptoJS.lib.WordArray.random(16).toString();
  }

  if (!processedCookie.MUSIC_U) {
    processedCookie.MUSIC_A = processedCookie.MUSIC_A || getAnonymousToken();
  }

  return processedCookie;
};

/** header cookie生成 */
const createHeaderCookie = (header: Record<string, any>): string => {
  const headerKeys = keys(header);
  const cookieParts = new Array(headerKeys.length);

  for (let i = 0, len = headerKeys.length; i < len; i++) {
    const key = headerKeys[i];
    cookieParts[i] =
      encodeURIComponent(key) + '=' + encodeURIComponent(header[key]);
  }

  return cookieParts.join('; ');
};

/** requestId生成 */
const generateRequestId = (): string => {
  return `${now()}_${floor(random() * 1000)
    .toString()
    .padStart(4, '0')}`;
};

const createRequest = (
  uri: string,
  data: Record<string, any>,
  options: Record<string, any>,
): Promise<WyyResponse> => {
  return new Promise((resolve, reject) => {
    // 变量声明和初始化
    const headers: Record<string, any> = options.headers ? { ...options.headers } : {};
    const ip = options.realIP || options.ip || '';

    // IP头设置
    if (ip) {
      headers['X-Real-IP'] = ip;
      headers['X-Forwarded-For'] = ip;
    }

    let cookie = options.cookie || {};
    if (typeof cookie === 'string') {
      cookie = cookieToJson(cookie);
    }

    if (typeof cookie === 'object') {
      cookie = processCookieObject(cookie, uri);
      headers['Cookie'] = cookieObjToString(cookie);
    }
    let url = '';
    let encryptData: any = '';
    let crypto = options.crypto;
    const csrfToken = cookie['__csrf'] || '';

    // 加密方式选择
    if (crypto === '') {
      crypto = APP_CONF.encrypt ? 'eapi' : 'api';
    }

    const answer: WyyResponse = { status: 500, body: {}, cookie: [] };

    data.e_r = toBoolean(
      options.e_r !== undefined
        ? options.e_r
        : data.e_r !== undefined
          ? data.e_r
          : ENCRYPT_RESPONSE,
    );
    // 根据加密方式处理
    switch (crypto) {
      case 'weapi':
        headers['Referer'] = options.domain || DOMAIN;
        headers['User-Agent'] = options.ua || chooseUserAgent('weapi');
        data.csrf_token = csrfToken;
        encryptData = encrypt.weapi(data);
        url = (options.domain || DOMAIN) + '/weapi/' + uri.substr(5);
        break;

      case 'linuxapi':
        headers['User-Agent'] =
          options.ua || chooseUserAgent('linuxapi', 'linux');
        encryptData = encrypt.linuxapi({
          method: 'POST',
          url: (options.domain || DOMAIN) + uri,
          params: data,
        });
        url = (options.domain || DOMAIN) + '/api/linux/forward';
        break;

      case 'xeapi': {
        const xeapiPublicKey = loadXeapiPublicKey();
        if (!xeapiPublicKey) {
          throw new Error('xeapi public key is missing');
        }
        const xeapiOs = cookie.os === 'android' ? cookie.os : 'android';
        const xeapiAppver =
          cookie.os === 'android' && cookie.appver ? cookie.appver : '9.1.65';
        const xeapiOsver =
          cookie.os === 'android' && cookie.osver ? cookie.osver : '16';
        const xeapiBuildver =
          cookie.buildver || now().toString().substr(0, 10);
        headers['User-Agent'] = options.ua || chooseUserAgent('api', 'android');
        headers['X-Client-Enc-State'] = 'ENCRYPTED';
        headers['x-aeapi'] = true;
        headers['content-type'] =
          'application/x-www-form-urlencoded;charset=utf-8';
        headers['x-deviceid'] = cookie.deviceId;
        headers['x-os'] = xeapiOs;
        headers['x-osver'] = xeapiOsver;
        headers['x-appver'] = xeapiAppver;
        headers['x-sdeviceid'] = cookie.sDeviceId || cookie.deviceId;
        headers['x-buildver'] = xeapiBuildver;
        if (cookie.MUSIC_U) headers['x-music-u'] = cookie.MUSIC_U;
        const xeapiCookie = {
          ...cookie,
          os: xeapiOs,
          osver: xeapiOsver,
          appver: xeapiAppver,
          buildver: xeapiBuildver,
          deviceId: cookie.deviceId,
          sDeviceId: cookie.sDeviceId || cookie.deviceId,
        };
        headers['Cookie'] = cookieObjToString(xeapiCookie);
        url = (options.domain || XEAPI_DOMAIN) + '/xeapi/' + uri.substr(5);
        encryptData = encrypt.xeapi(uri, data, {
          ...options,
          publicKeyState: xeapiPublicKey,
          sessionId: xeapiSessionId,
          sessionKey: xeapiSessionKey,
          appver: xeapiAppver,
          deviceId: cookie.deviceId,
          os: xeapiOs,
          uid: cookie.uid || cookie.userId || '',
        });
        break;
      }

      case 'eapi':
      case 'api': {
        // header创建
        const header: Record<string, any> = {
          osver: cookie.osver,
          deviceId: cookie.deviceId,
          os: cookie.os,
          appver: cookie.appver,
          versioncode: cookie.versioncode || '140',
          mobilename: cookie.mobilename || '',
          buildver: cookie.buildver || now().toString().substr(0, 10),
          resolution: cookie.resolution || '1920x1080',
          __csrf: csrfToken,
          channel: cookie.channel,
          requestId: generateRequestId(),
          ...(options.checkToken
            ? { 'X-antiCheatToken': APP_CONF.checkToken }
            : {}),
          // clientSign: APP_CONF.clientSign,
        };

        if (cookie.MUSIC_U) header['MUSIC_U'] = cookie.MUSIC_U;
        if (cookie.MUSIC_A) header['MUSIC_A'] = cookie.MUSIC_A;

        headers['Cookie'] = createHeaderCookie(header);
        headers['User-Agent'] =
          options.ua ||
          (cookie.os === 'osx'
            ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            : chooseUserAgent('api', 'iphone'));

        if (crypto === 'eapi') {
          // headers['x-aeapi'] = true // 服务器会使用gzip压缩返回值
          data.header = header;

          encryptData = encrypt.eapi(uri, data);
          url = (options.domain || API_DOMAIN) + '/eapi/' + uri.substr(5);
        } else if (crypto === 'api') {
          url = (options.domain || API_DOMAIN) + uri;
          encryptData = data;
        }
        break;
      }

      default:
        console.log('[ERR]', 'Unknown Crypto:', crypto);
        break;
    }
    // settings创建
    const settings: any = {
      method: 'POST',
      url: url,
      headers: headers,
      data: new URLSearchParams(encryptData).toString(),
      httpAgent: createHttpAgent(),
      httpsAgent: createHttpsAgent(),
    };

    // 使用返回值加密
    const use_e_r = (crypto === 'eapi' || crypto === 'weapi') && data.e_r;
    const use_xeapi = crypto === 'xeapi';
    if (use_e_r || use_xeapi) {
      settings.encoding = null;
      settings.responseType = 'arraybuffer';
    }

    // 代理处理
    if (options.proxy) {
      if (options.proxy.indexOf('pac') > -1) {
        const agent = new PacProxyAgent(options.proxy);
        settings.httpAgent = agent;
        settings.httpsAgent = agent;
      } else {
        try {
          const purl = new URL(options.proxy);
          if (purl.hostname) {
            const isHttps = purl.protocol === 'https:';
            const agent = tunnel[isHttps ? 'httpsOverHttp' : 'httpOverHttp']({
              proxy: {
                host: purl.hostname,
                port: Number(purl.port) || 80,
                proxyAuth:
                  purl.username && purl.password
                    ? purl.username + ':' + purl.password
                    : '',
              },
            });
            settings.httpsAgent = agent;
            settings.httpAgent = agent;
            settings.proxy = false;
          } else {
            console.error('代理配置无效,不使用代理');
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error('代理URL解析失败:', message);
        }
      }
    } else {
      settings.proxy = false;
    }

    axios(settings)
      .then((res) => {
        const body = res.data;
        answer.cookie = ((res.headers['set-cookie'] || []) as string[]).map(
          (x) => x.replace(/\s*Domain=[^(;|$)]+;*/, ''),
        );

        try {
          if (use_xeapi) {
            if (res.headers['x-encr-ssid'] && res.headers['x-encr-sskey']) {
              xeapiSessionId = res.headers['x-encr-ssid'];
              xeapiSessionKey = res.headers['x-encr-sskey'];
            }
            answer.body = encrypt.xeapiResDecrypt(Buffer.from(body));
          } else if (use_e_r) {
            answer.body = encrypt.eapiResDecrypt(
              body.toString('hex').toUpperCase(),
              headers['x-aeapi'],
            );
          } else {
            answer.body =
              typeof body === 'object' ? body : parse(body.toString());
          }

          if (answer.body.code) {
            answer.body.code = Number(answer.body.code);
          }

          answer.status = Number(answer.body.code || res.status);

          // 状态码检查（使用Set提升查找性能）
          if (SPECIAL_STATUS_CODES.has(answer.body.code)) {
            answer.status = 200;
          }
        } catch {
          answer.body = body;
          answer.status = res.status;
        }

        answer.status =
          answer.status > 100 && answer.status < 600 ? answer.status : 400;

        if (answer.status === 200) {
          resolve(answer);
        } else {
          console.log('[ERR]', answer);
          reject(answer);
        }
      })
      .catch((err) => {
        answer.status = 502;
        answer.body = { code: 502, msg: err.message || err };
        console.log('[ERR]', answer);
        reject(answer);
      });
  });
};

export default createRequest;
