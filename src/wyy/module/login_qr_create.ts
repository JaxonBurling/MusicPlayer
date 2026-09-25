import type { WyyQuery } from '../util/types';

import QRCode from 'qrcode';
import { generateChainId } from '../util/index';

export default (query: WyyQuery) => {
  return new Promise(async (resolve: any) => {
    const platform = query.platform || 'pc'
    const cookie = query.cookie || ''

    // 构建基础URL
    let url = `https://music.163.com/login?codekey=${query.key}`

    // 如果是web平台，则添加chainId参数

    if (platform === 'web') {
      const chainId = generateChainId(cookie)
      url += `&chainId=${chainId}`
    }
    return resolve({
      code: 200,
      status: 200,
      body: {
        code: 200,
        data: {
          qrurl: url,
          qrimg: query.qrimg ? await QRCode.toDataURL(url) : '',
        },
      },
    })
  })
}
