import type { KugouParams, UseAxios } from '../util/types';

import qrcode from 'qrcode';
// 酷狗二维码生成

export default (params: KugouParams, _useAxios: UseAxios) => {
  return new Promise(async (resolve: any) => {
    const url = `https://h5.kugou.com/apps/loginQRCode/html/index.html?qrcode=${params.key}`
    return resolve({
      code: 200,
      status: 200,
      body: {
        code: 200,
        data: {
          url: url,
          base64: params?.qrimg ? await qrcode.toDataURL(url) : '',
        },
      },
    })
  })
}