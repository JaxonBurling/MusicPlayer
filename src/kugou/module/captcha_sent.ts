import type { KugouParams, UseAxios } from '../util/types';

// 手机验证码发送
export default (params: KugouParams, useAxios: UseAxios) => {
  const dataMap: Record<string, any> = {
    businessid: 5,
    mobile: `${params?.mobile}`,
    plat: 3,
  };

  return useAxios({
    baseURL: 'http://login.user.kugou.com',
    url: '/v7/send_mobile_code',
    method: 'POST',
    data: dataMap,
    encryptType: 'android',
    cookie: {mid: params?.cookie?.KUGOU_API_MID},
  });
};
