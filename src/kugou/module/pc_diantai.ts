import type { KugouParams, UseAxios } from '../util/types';

// 电台 banner
export default (params: KugouParams, useAxios: UseAxios) => {
  const userid = params?.cookie?.userid || params?.userid || 0;
  const dataMap: Record<string, any> = {
    isvip: 0,
    userid,
    vipType: 0,
  };
  return useAxios({
    baseURL: 'https://adservice.kugou.com',
    url: '/v3/pc_diantai',
    data: dataMap,
    method: 'post',
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
