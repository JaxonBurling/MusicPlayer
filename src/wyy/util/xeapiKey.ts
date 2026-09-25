/**
 * @fileoverview xeapi 公钥获取工具
 * @module util/xeapiKey
 */

import registerXeapiKey from '../module/register_xeapikey';

/**
 * 获取 xeapi 公钥（必要时复用已有的 sk）
 * @param currentPublicKey 当前公钥
 * @param deviceId 设备 ID
 * @returns 公钥对象
 */
const getXeapiPublicKey = async (
  currentPublicKey: Record<string, any> = {},
  deviceId = '',
): Promise<Record<string, any>> => {
  const result = await registerXeapiKey(
    {
      deviceId,
      currentKeyVersion: currentPublicKey.version || '',
    },
    null as any,
  );

  const publicKey = result.body;
  if (!publicKey.sk && currentPublicKey.sk) {
    publicKey.sk = currentPublicKey.sk;
  }
  if (!publicKey.sk) {
    throw new Error('xeapi public key response missing sk');
  }
  return publicKey;
};

export { getXeapiPublicKey };
