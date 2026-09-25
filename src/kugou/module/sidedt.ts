import type { KugouParams, UseAxios } from '../util/types';

/**
 * sidEdt.js
 * ----------
 * 完整移植自你提供的浏览器 script（未删减任何函数），
 * 只把浏览器专属的 API 替换为 Node 等价实现。
 *
 * 使用方法:
 *   import { generateSidEdt } from './sidEdt';
 *   const { sid, edt } = await generateSidEdt({ userid, dfid, mid });
 *
 *   // sid、edt 均为 Base64 编码，可直接放到登录请求的 URL/JSON 中
 */

'use strict';
import { generateSimulate } from '../util/generate_simulate';
import { generateWebGLHash } from '../util/util';
import verifyUserInfo from './verify_user_info';

export default async (params: KugouParams, useAxios: UseAxios) => {
  const webglHash = params?.cookie.KUGOU_API_WEBGL || generateWebGLHash(); // WebGL 指纹哈希
  const userid = params?.userid || params?.cookie.userid || '0';
  const dfid = params?.dfid || params?.cookie.dfid || '0';
  const mid = params?.mid || params?.cookie.KUGOU_API_MID || '0';
  const value = generateSimulate(mid, userid, dfid, webglHash);
  const userParams: Record<string, any> = { ...params, edt: value.edt, sid: value.sid };
  return verifyUserInfo(userParams, useAxios);
};
