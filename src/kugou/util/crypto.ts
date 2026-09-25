/**
 * @fileoverview 酷狗音乐 API 加解密工具
 *
 * 基于 crypto-es（替代已停止维护的 crypto-js）与 node-forge 实现：
 * - AES-128-CBC 加解密（PKCS7 填充）
 * - MD5 / SHA1 摘要
 * - RSA 加密（自实现 raw 加密 + PKCS1 v1.5）
 *
 * 所有函数均兼容浏览器与 Node 环境。
 *
 * @module crypto
 * @requires crypto-es - 摘要与对称加密
 * @requires node-forge - RSA 非对称加密
 */

import { AES, Base64, CipherParams, CBC, Hex, MD5, MD5Algo, Pkcs7, SHA1, Utf8, WordArray } from 'crypto-es';
import forge from 'node-forge';
import { randomString } from './util';

export const publicRasKey = `-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDIAG7QOELSYoIJvTFJhMpe1s/gbjDJX51HBNnEl5HXqTW6lQ7LC8jr9fWZTwusknp+sVGzwd40MwP6U5yDE27M/X1+UR4tvOGOqp94TJtQ1EPnWGWXngpeIW5GxoQGao1rmYWAu6oi1z9XkChrsUdC6DJE5E221wf/4WLFxwAtRQIDAQAB\n-----END PUBLIC KEY-----`;
export const publicLiteRasKey = `-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDECi0Np2UR87scwrvTr72L6oO01rBbbBPriSDFPxr3Z5syug0O24QyQO8bg27+0+4kBzTBTBOZ/WWU0WryL1JSXRTXLgFVxtzIY41Pe7lPOgsfTCn5kZcvKhYKJesKnnJDNr5/abvTGf+rHG3YRwsCHcQ08/q6ifSioBszvb3QiwIDAQAB\n-----END PUBLIC KEY-----`;

/** RSA 公钥解析缓存，避免重复解析 PEM */
const rsaKeyCache = new Map<string, forge.pki.rsa.PublicKey>();

/** AES 单例加密结果 */
export interface AesEncryptResult {
  str: string;
  key: string;
}

/**
 * 将字符串编码为 UTF-8 字节数组（不依赖 TextEncoder）
 * @param str 输入字符串
 * @returns UTF-8 字节数组
 */
function encodeUtf8(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }

  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(str, 'utf8'));
  }

  const codePoints: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i++;
      }
    }
    codePoints.push(code);
  }

  const bytes: number[] = [];
  for (const code of codePoints) {
    if (code <= 0x7f) {
      bytes.push(code);
    } else if (code <= 0x7ff) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code <= 0xffff) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  return new Uint8Array(bytes);
}

/**
 * 将 UTF-8 字节数组解码为字符串（不依赖 TextDecoder）
 * @param uint8 字节数组
 * @returns UTF-8 字符串
 */
function decodeUtf8(uint8: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(uint8);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(uint8).toString('utf8');
  }

  let out = '';
  let i = 0;
  while (i < uint8.length) {
    const byte1 = uint8[i++];
    if (byte1 < 0x80) {
      out += String.fromCharCode(byte1);
      continue;
    }
    if (byte1 < 0xe0) {
      const byte2 = uint8[i++] & 0x3f;
      out += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
      continue;
    }
    if (byte1 < 0xf0) {
      const byte2 = uint8[i++] & 0x3f;
      const byte3 = uint8[i++] & 0x3f;
      out += String.fromCharCode(((byte1 & 0x0f) << 12) | (byte2 << 6) | byte3);
      continue;
    }

    const byte2 = uint8[i++] & 0x3f;
    const byte3 = uint8[i++] & 0x3f;
    const byte4 = uint8[i++] & 0x3f;
    let codePoint = ((byte1 & 0x07) << 18) | (byte2 << 12) | (byte3 << 6) | byte4;
    codePoint -= 0x10000;
    out += String.fromCharCode((codePoint >> 10) + 0xd800, (codePoint & 0x3ff) + 0xdc00);
  }

  return out;
}

/**
 * 将任意输入规范化为字节数组
 * @param data 字符串 / 对象 / 字节数组
 * @returns 字节数组
 */
function normalizeBuffer(data: string | Uint8Array | Record<string, any>): Uint8Array {
  if (data instanceof Uint8Array) return data;
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return encodeUtf8(str);
}

/**
 * 字节数组转 WordArray
 * @param uint8 字节数组
 * @returns WordArray
 */
function wordArrayFromBuffer(uint8: Uint8Array): WordArray {
  const words: number[] = [];
  for (let i = 0; i < uint8.length; i += 4) {
    words.push(
      ((uint8[i] || 0) << 24) | ((uint8[i + 1] || 0) << 16) |
      ((uint8[i + 2] || 0) << 8) | (uint8[i + 3] || 0)
    );
  }
  return new WordArray(words, uint8.length);
}

/**
 * WordArray 转字节数组
 * @param wordArray WordArray
 * @returns 字节数组
 */
function wordArrayToBuffer(wordArray: WordArray): Uint8Array {
  const { words, sigBytes } = wordArray;
  const uint8 = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    uint8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return uint8;
}

/**
 * 字节数组转十六进制字符串
 * @param arr 字节数组
 * @returns 十六进制字符串
 */
function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 字符串或字节数组转 WordArray
 * @param input 输入
 * @returns WordArray
 */
function utf8WordArray(input: string | Uint8Array): WordArray {
  return typeof input === 'string' ? Utf8.parse(input) : wordArrayFromBuffer(input);
}

/**
 * 解析 RSA 公钥（带缓存）
 * @param pem PEM 格式公钥
 * @returns forge 公钥对象
 */
function getForgePublicKey(pem: string): forge.pki.rsa.PublicKey {
  if (!rsaKeyCache.has(pem)) {
    rsaKeyCache.set(pem, forge.pki.publicKeyFromPem(pem) as forge.pki.rsa.PublicKey);
  }
  return rsaKeyCache.get(pem)!;
}

/**
 * 字节数组转二进制字符串
 * @param buffer 字节数组
 * @returns 二进制字符串
 */
function bufferToBinaryString(buffer: Uint8Array): string {
  let out = '';
  for (let i = 0; i < buffer.length; i++) out += String.fromCharCode(buffer[i]);
  return out;
}

/**
 * 原生 RSA 加密（无填充，手动补零到密钥长度）
 * @param buffer 明文
 * @param publicKey 公钥
 * @returns 十六进制密文
 */
function rsaRawEncrypt(buffer: Uint8Array, publicKey: forge.pki.rsa.PublicKey): string {
  const keyLength = Math.ceil(publicKey.n.bitLength() / 8);
  const message = new forge.jsbn.BigInteger(uint8ArrayToHex(buffer), 16);
  const encrypted = message.modPow(publicKey.e, publicKey.n);
  return encrypted.toString(16).padStart(keyLength * 2, '0');
}

/**
 * MD5 加密
 * @param data 待加密数据
 * @returns 32 位小写 hex
 */
function cryptoMd5(data: string | Uint8Array | Record<string, any>): string {
  let message: string | WordArray;
  if (typeof data === 'string') message = data;
  else if (data instanceof Uint8Array) message = wordArrayFromBuffer(data);
  else message = JSON.stringify(data);
  return MD5(message).toString(Hex);
}

/**
 * SHA1 加密
 * @param data 待加密数据
 * @returns 40 位小写 hex
 */
function cryptoSha1(data: string | Uint8Array | Record<string, any>): string {
  let message: string | WordArray;
  if (typeof data === 'string') message = data;
  else if (data instanceof Uint8Array) message = wordArrayFromBuffer(data);
  else message = JSON.stringify(data);
  return SHA1(message).toString(Hex);
}

/**
 * AES 加密
 * @param data 需要加密的数据
 * @param opt 可选密钥与 IV
 * @returns 指定 key/iv 时返回 hex 字符串，否则返回 { str, key }
 */
function cryptoAesEncrypt(
  data: string | Uint8Array | Record<string, any>,
  opt: { key: string; iv: string },
): string;
function cryptoAesEncrypt(
  data: string | Uint8Array | Record<string, any>,
  opt?: { key?: string; iv?: string },
): AesEncryptResult;
function cryptoAesEncrypt(
  data: string | Uint8Array | Record<string, any>,
  opt?: { key?: string; iv?: string },
): AesEncryptResult | string {
  const plain = typeof data === 'object' && !(data instanceof Uint8Array) ? JSON.stringify(data) : data;
  const buffer = normalizeBuffer(plain);
  let key: string;
  let iv: string;
  let tempKey = '';

  if (opt?.key && opt?.iv) {
    key = opt.key;
    iv = opt.iv;
  } else {
    tempKey = opt?.key || randomString(16).toLowerCase();
    key = cryptoMd5(tempKey).substring(0, 32);
    iv = key.substring(key.length - 16);
  }

  const encrypted = AES.encrypt(wordArrayFromBuffer(buffer), utf8WordArray(key), {
    iv: utf8WordArray(iv),
    mode: CBC,
    padding: Pkcs7,
  });

  const hex = encrypted.ciphertext!.toString(Hex);
  if (opt?.key && opt?.iv) return hex;
  return { str: hex, key: tempKey };
}

/**
 * AES 解密
 * @param data hex 密文
 * @param key 密钥
 * @param iv 可选 IV
 * @returns 解密后的对象或字符串
 */
function cryptoAesDecrypt(data: string, key: string, iv?: string): string | Record<string, any> {
  if (!iv) key = cryptoMd5(key).substring(0, 32);
  iv = iv || key.substring(key.length - 16);
  const cipherParams = new CipherParams({ ciphertext: Hex.parse(data) });

  const decrypted = AES.decrypt(cipherParams, utf8WordArray(key), {
    iv: utf8WordArray(iv),
    mode: CBC,
    padding: Pkcs7,
  });

  const text = decodeUtf8(wordArrayToBuffer(decrypted));
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * RSA 加密（原生无填充）
 * @param data 待加密数据
 * @param publicKey 可选公钥 PEM
 * @returns 十六进制密文
 */
function cryptoRSAEncrypt(data: string | Uint8Array | Record<string, any>, publicKey?: string): string {
  const isLite = process.env.platform === 'lite';
  const buffer = normalizeBuffer(data);
  const pem = publicKey || (isLite ? publicLiteRasKey : publicRasKey);
  const key = getForgePublicKey(pem);
  const keyLength = Math.ceil(key.n.bitLength() / 8);

  if (buffer.length > keyLength) throw new Error('Data length exceeds key size');
  let padded = buffer;
  if (buffer.length < keyLength) {
    padded = new Uint8Array(keyLength);
    padded.set(buffer);
  }

  return rsaRawEncrypt(padded, key);
}

/**
 * RSA 加密（PKCS1 v1.5）
 * @param data 待加密数据
 * @returns 十六进制密文
 */
function rsaEncrypt2(data: string | Uint8Array | Record<string, any>): string {
  const isLite = process.env.platform === 'lite';
  const buffer = normalizeBuffer(data);
  const key = getForgePublicKey(isLite ? publicLiteRasKey : publicRasKey);
  const encrypted = key.encrypt(bufferToBinaryString(buffer), 'RSAES-PKCS1-V1_5');
  return forge.util.bytesToHex(encrypted);
}

/**
 * 歌单 AES 加密（密钥内嵌于返回值）
 * @param data 待加密数据
 * @returns { key, str }（str 为 Base64 密文）
 */
function playlistAesEncrypt(data: string | Record<string, any>): AesEncryptResult {
  const useData = typeof data === 'object' ? JSON.stringify(data) : data;
  const key = randomString(6).toLowerCase();
  const encryptKey = cryptoMd5(key).substring(0, 16);
  const iv = cryptoMd5(key).substring(16, 32);

  const encrypted = AES.encrypt(Utf8.parse(useData), utf8WordArray(encryptKey), {
    iv: utf8WordArray(iv),
    mode: CBC,
    padding: Pkcs7,
  });

  return { key, str: encrypted.ciphertext!.toString(Base64) };
}

/**
 * 歌单 AES 解密
 * @param data { key, str } 加密结果
 * @returns 解密后的对象或字符串
 */
function playlistAesDecrypt(data: AesEncryptResult): string | Record<string, any> {
  const encryptKey = cryptoMd5(data.key).substring(0, 16);
  const iv = cryptoMd5(data.key).substring(16, 32);

  const cipherParams = new CipherParams({ ciphertext: Base64.parse(data.str) });
  const decrypted = AES.decrypt(cipherParams, utf8WordArray(encryptKey), {
    iv: utf8WordArray(iv),
    mode: CBC,
    padding: Pkcs7,
  });

  const text = decodeUtf8(wordArrayToBuffer(decrypted));
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export {
  cryptoAesDecrypt,
  cryptoAesEncrypt,
  cryptoMd5,
  cryptoRSAEncrypt,
  rsaEncrypt2,
  cryptoSha1,
  playlistAesEncrypt,
  playlistAesDecrypt,
  wordArrayFromBuffer,
  MD5Algo,
};
