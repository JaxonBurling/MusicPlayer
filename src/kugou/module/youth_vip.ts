import type { KugouParams, UseAxios } from '../util/types';

// 领取vip 需要登录
export default (params: KugouParams, useAxios: UseAxios) => {
  const time = Date.now();
  const dataMap: Record<string, any> = {
    ad_id: 12307537187,
    play_end: time,
    play_start: time - 30000,
  };

  return useAxios({
    url: '/youth/v1/ad/play_report',
    encryptType: 'android',
    method: 'post',
    data: dataMap,
    cookie: params?.cookie,
  });
};
