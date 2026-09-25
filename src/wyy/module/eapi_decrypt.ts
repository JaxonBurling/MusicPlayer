import type { WyyQuery, WyyRequest } from '../util/types';

import { eapiResDecrypt, eapiReqDecrypt } from '../util/crypto';

export default async (query: WyyQuery, _request: WyyRequest) => {
  const hexString = query.hexString
  const isReq = query.isReq != 'false'
  if (!hexString) {
    return {
      status: 400,
      body: {
        code: 400,
        message: 'hex string is required',
      },
    }
  }
  // 去除空格
  let pureHexString = hexString.replace(/\s/g, '')
  return {
    status: 200,
    body: {
      code: 200,
      data: isReq
        ? eapiReqDecrypt(pureHexString)
        : eapiResDecrypt(pureHexString),
    },
  }
}
