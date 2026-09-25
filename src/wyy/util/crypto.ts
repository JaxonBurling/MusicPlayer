/**
 * @fileoverview 网易云音乐加解密工具
 *
 * 基于 crypto-es（替代已停止维护的 crypto-js）与 Node crypto/zlib 实现：
 * - weapi / linuxapi / eapi / xeapi 请求加密
 * - eapi / xeapi 响应解密
 * - X25519 + AES-GCM 会话密钥交换（xeapi）
 *
 * @module util/crypto
 * @requires crypto-es - MD5 与 AES
 * @requires node-forge - RSA
 */

import {
  AES,
  Base64,
  CBC,
  ECB,
  Hex,
  MD5,
  Pkcs7,
  Utf8,
} from 'crypto-es';
import crypto from 'crypto';
import forge from 'node-forge';
import zlib from 'zlib';

const iv = '0102030405060708';
const presetKey = '0CoJUm6Qyw8W8jud';
const linuxapiKey = 'rFgB&h#%2?^eDg:Q';
const base62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const publicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`;
const eapiKey = 'e82ckenh8dichen8';
const xeapiStaticKey = Buffer.from(
  'ab1d5a430f6bb04a3f01e81ddd72bd916d5ce591248ac128714806d7f8fb1b84',
  'hex',
);
const xeapiSignKey =
  'mUHCwVNWJbunMqAHf5MImuirT6plvs6VSFW62MGHstFQxhBGdEoIhLItH3djc4+FB/OKty3+lL2rGeoFBpVe5g==';
const x25519SpkiPrefix = Buffer.from('302a300506032b656e032100', 'hex');

/** crypto-js 风格的模式映射 */
const modeMap: Record<string, any> = { CBC, ECB };

/** AES 加密 */
const aesEncrypt = (
  text: string,
  mode: string,
  key: string,
  ivStr: string,
  format = 'base64',
): string => {
  const encrypted = AES.encrypt(Utf8.parse(text), Utf8.parse(key), {
    iv: Utf8.parse(ivStr),
    mode: modeMap[mode.toUpperCase()],
    padding: Pkcs7,
  });
  if (format === 'base64') {
    return encrypted.toString();
  }

  return encrypted.ciphertext!.toString(Hex).toUpperCase();
};

/** AES 解密（返回 WordArray） */
const aesDecrypt = (
  ciphertext: string,
  key: string,
  ivStr: string,
  format = 'base64',
) => {
  let bytes;
  if (format === 'base64') {
    bytes = AES.decrypt(ciphertext, Utf8.parse(key), {
      iv: Utf8.parse(ivStr),
      mode: ECB,
      padding: Pkcs7,
    });
  } else {
    bytes = AES.decrypt(
      { ciphertext: Hex.parse(ciphertext) },
      Utf8.parse(key),
      {
        iv: Utf8.parse(ivStr),
        mode: ECB,
        padding: Pkcs7,
      },
    );
  }
  return bytes;
};

/** RSA 加密（无填充） */
const rsaEncrypt = (str: string, key: string): string => {
  const forgePublicKey = forge.pki.publicKeyFromPem(key);
  const encrypted = forgePublicKey.encrypt(str, 'NONE');
  return forge.util.bytesToHex(encrypted);
};

/** weapi 加密 */
const weapi = (object: Record<string, any>) => {
  const text = JSON.stringify(object);
  let secretKey = '';
  for (let i = 0; i < 16; i++) {
    secretKey += base62.charAt(Math.round(Math.random() * 61));
  }
  return {
    params: aesEncrypt(
      aesEncrypt(text, 'cbc', presetKey, iv),
      'cbc',
      secretKey,
      iv,
    ),
    encSecKey: rsaEncrypt(secretKey.split('').reverse().join(''), publicKey),
  };
};

/** linuxapi 加密 */
const linuxapi = (object: Record<string, any>) => {
  const text = JSON.stringify(object);
  return {
    eparams: aesEncrypt(text, 'ecb', linuxapiKey, '', 'hex'),
  };
};

/** eapi 加密 */
const eapi = (url: string, object: Record<string, any> | string) => {
  const text = typeof object === 'object' ? JSON.stringify(object) : object;
  const message = `nobody${url}use${text}md5forencrypt`;
  const digest = MD5(message).toString();
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
  return {
    params: aesEncrypt(data, 'ecb', eapiKey, '', 'hex'),
  };
};

/** eapi 响应解密 */
const eapiResDecrypt = (encryptedParams: string | Buffer, aeapi = false) => {
  // 使用aesDecrypt解密参数
  try {
    const decrypted = aesDecrypt(
      encryptedParams as string,
      eapiKey,
      '',
      'hex',
    ); // WordArray

    if (aeapi) {
      // 带压缩的解密：先转 Base64 再解压
      const decryptedBuffer = Buffer.from(
        decrypted.toString(Base64),
        'base64',
      );
      const decompressed = zlib.gunzipSync(decryptedBuffer);
      return JSON.parse(decompressed.toString());
    } else {
      // 普通解密：直接转 UTF-8 字符串
      return JSON.parse(decrypted.toString(Utf8));
    }
  } catch (error) {
    console.log(`eapiResDecrypt error:`, error);
    return null;
  }
};

/** eapi 请求解密 */
const eapiReqDecrypt = (encryptedParams: string) => {
  // 使用 aesDecrypt 解密参数
  const decryptedData = aesDecrypt(
    encryptedParams,
    eapiKey,
    '',
    'hex',
  ).toString(Utf8);
  // 使用正则表达式解析出 URL 和数据
  const match = decryptedData.match(
    /(.*?)-36cd479b6b5-(.*?)-36cd479b6b5-(.*)/,
  );
  if (match) {
    const url = match[1];
    const data = JSON.parse(match[2]);
    return { url, data };
  }

  // 如果没有匹配到，返回 null
  return null;
};

/** 通用解密 */
const decrypt = (cipher: string): string => {
  const decipher = AES.decrypt(
    {
      ciphertext: Hex.parse(cipher),
    },
    eapiKey,
    {
      mode: ECB,
    },
  );
  const decryptedBytes = decipher.toString(Utf8);
  return decryptedBytes;
};

/** AES-ECB 加密（Node crypto） */
const aesEcbEncrypt = (
  key: Buffer,
  plaintext: Buffer | string,
): Buffer => {
  const cipher = crypto.createCipheriv(`aes-${key.length * 8}-ecb`, key, null);
  return Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
};

/** AES-ECB 解密（Node crypto） */
const aesEcbDecrypt = (key: Buffer | string, ciphertext: Buffer): Buffer => {
  const decipher = crypto.createDecipheriv(
    `aes-${(key as Buffer).length * 8}-ecb`,
    key as Buffer,
    null,
  );
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

/** 由 32 字节 raw key 构造 X25519 公钥 */
const createX25519PublicKey = (raw: Buffer) => {
  // Node's crypto API expects X25519 public keys as DER SubjectPublicKeyInfo.
  // The Android SDK stores only the 32-byte raw key, so prepend the fixed
  // RFC 8410 SPKI header for id-X25519 before importing it.
  return crypto.createPublicKey({
    key: Buffer.concat([x25519SpkiPrefix, raw]),
    format: 'der',
    type: 'spki',
  });
};

/** 派生 X25519 共享密钥对应的 AES 密钥 */
const deriveX25519AesKey = (
  sharedSecret: Buffer,
  ephemeralPublicKey: Buffer,
): Buffer => {
  const prk = crypto
    .createHmac('sha256', Buffer.alloc(32))
    .update(sharedSecret.length ? sharedSecret : Buffer.alloc(32))
    .digest();
  return crypto
    .createHmac('sha256', prk)
    .update(Buffer.concat([ephemeralPublicKey, Buffer.from([1])]))
    .digest()
    .subarray(0, 16);
};

/** xeapi 签名 */
const xeapiSign = (timestamp: number | string, nonce: string): string => {
  return crypto
    .createHmac('sha256', xeapiSignKey)
    .update(String(timestamp) + nonce)
    .digest('base64');
};

/** xeapi 中间层变换 */
const xeapiMidTransform = (ciphertext: Buffer): Buffer => {
  const random = crypto.randomBytes(16);
  const xored = Buffer.alloc(ciphertext.length);
  for (let i = 0; i < ciphertext.length; i++) {
    xored[i] = ciphertext[i] ^ random[i & 0x0f];
  }
  const b64 = Buffer.from(xored.toString('base64'));
  const rot = b64.length ? (random[0] & 0x0f) % b64.length : 0;
  return Buffer.concat([random, b64.subarray(rot), b64.subarray(0, rot)]);
};

/** xeapi S 段加密（X25519 + AES-GCM） */
const xeapiEncryptS = (
  dynamicKey: Buffer,
  publicKeyState: Record<string, any>,
  os: string,
): Buffer => {
  const peerRaw = Buffer.from(publicKeyState.publicKey, 'base64');
  const peerKey = createX25519PublicKey(peerRaw);
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
  const ephemeralRaw = Buffer.from(
    publicKey.export({ format: 'der', type: 'spki' }),
  ).subarray(-32);
  const sharedSecret = crypto.diffieHellman({
    privateKey,
    publicKey: peerKey,
  });
  const aesKey = deriveX25519AesKey(sharedSecret, ephemeralRaw);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, iv);
  const plaintext = Buffer.from(
    `${dynamicKey.toString('base64')}|${os}|${publicKeyState.sk || ''}`,
  );
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([ephemeralRaw, iv, encrypted, cipher.getAuthTag()]);
};

/** 构建 xeapi 明文 */
const buildXeapiPlaintext = (
  uri: string,
  data: Record<string, any>,
  options: Record<string, any> = {},
): string => {
  const fields: Record<string, any> = {};
  const contentType =
    options.contentType || 'application/x-www-form-urlencoded;charset=utf-8';
  const mediaType = contentType.split(';', 1)[0].toLowerCase();
  if (mediaType !== 'application/x-www-form-urlencoded') {
    fields.contentType = contentType;
  }

  const method = (options.method || 'POST').toUpperCase();
  if (method !== 'POST') fields.method = method;

  const url = new URL(uri, 'https://interface.music.163.com');
  if (url.search) fields.queryString = url.search.slice(1);

  if (data !== undefined && data !== null) {
    const bodyData = { ...data };
    delete bodyData.e_r;
    const body = Buffer.from(new URLSearchParams(bodyData).toString());
    fields.body = body.toString('base64');
  }

  if (fields.queryString) {
    fields.queryString += '&e_r=true';
  } else {
    fields.queryString = 'e_r=true';
  }
  return JSON.stringify(fields);
};

/** xeapi 加密 */
const xeapi = (
  uri: string,
  data: Record<string, any>,
  options: Record<string, any> = {},
) => {
  const publicKeyState = options.publicKeyState;
  if (!publicKeyState) {
    throw new Error('xeapi publicKeyState is required');
  }
  const activeSessionKey = options.sessionKey
    ? Buffer.from(String(options.sessionKey))
    : null;
  const activeSessionId = options.sessionId || '';
  const dynamicKey = activeSessionKey || crypto.randomBytes(16);
  const plaintext = Buffer.from(buildXeapiPlaintext(uri, data, options));

  const b = aesEcbEncrypt(
    dynamicKey,
    xeapiMidTransform(aesEcbEncrypt(xeapiStaticKey, plaintext)),
  );
  const s = xeapiEncryptS(dynamicKey, publicKeyState, options.os || 'android');
  const r = aesEcbEncrypt(
    xeapiStaticKey,
    Buffer.from(
      `${publicKeyState.version}|${activeSessionKey ? activeSessionId : ''}`,
    ),
  );

  return {
    B: b.toString('base64'),
    S: s.toString('base64'),
    R: r.toString('base64'),
  };
};

/** xeapi 响应解密 */
const xeapiResDecrypt = (body: Buffer) => {
  const decrypted = aesEcbDecrypt(eapiKey, body);
  const plaintext =
    decrypted[0] === 0x1f && decrypted[1] === 0x8b
      ? zlib.gunzipSync(decrypted)
      : decrypted;
  return JSON.parse(plaintext.toString());
};

/** 解密 xeapi 公钥 */
const xeapiDecryptPublicKey = (encryptedData: string) => {
  return JSON.parse(
    aesEcbDecrypt(
      xeapiStaticKey,
      Buffer.from(encryptedData, 'base64'),
    ).toString(),
  );
};

export {
  weapi,
  linuxapi,
  eapi,
  xeapi,
  decrypt,
  aesEncrypt,
  aesDecrypt,
  eapiReqDecrypt,
  eapiResDecrypt,
  xeapiSign,
  xeapiResDecrypt,
  xeapiDecryptPublicKey,
};

export default {
  weapi,
  linuxapi,
  eapi,
  xeapi,
  decrypt,
  aesEncrypt,
  aesDecrypt,
  eapiReqDecrypt,
  eapiResDecrypt,
  xeapiSign,
  xeapiResDecrypt,
  xeapiDecryptPublicKey,
};
