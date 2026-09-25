import type { KugouParams, UseAxios } from '../util/types';

import { srcappid, appid } from '../util';

// 二维码 key 生成接口
export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    baseURL: 'https://login-user.kugou.com',
    url: '/v2/qrcode',
    method: 'GET',
    params: {
      appid: params?.type === 'web' ? 1014 : 1001,
      type: 1,
      plat: 4,
      qrcode_txt: `https://h5.kugou.com/apps/loginQRCode/html/index.html?appid=${appid}&`,
      srcappid,
    },
    encryptType: 'web',
    cookie: params?.cookie || {},
  });
};
