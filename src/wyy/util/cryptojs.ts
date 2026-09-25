/**
 * @fileoverview crypto-js 兼容层
 *
 * crypto-js 已停止维护，项目统一改用 crypto-es。
 * 本模块将 crypto-es 的具名导出重新组织为 crypto-js 风格的 CryptoJS 命名空间，
 * 便于旧代码以 `CryptoJS.xxx` 的方式平滑迁移。
 *
 * @module cryptojs
 * @requires crypto-es
 */

import {
  AES,
  Base64,
  CBC,
  ECB,
  Hex,
  Latin1,
  MD5,
  Pkcs7,
  SHA1,
  Utf8,
  CipherParams,
  WordArray,
} from 'crypto-es';

/** crypto-js 风格命名空间（仅包含项目实际用到的 API） */
const CryptoJS = {
  AES,
  MD5,
  SHA1,
  enc: { Base64, Hex, Utf8, Latin1 },
  mode: { CBC, ECB },
  pad: { Pkcs7 },
  lib: { WordArray, CipherParams },
};

export default CryptoJS;
