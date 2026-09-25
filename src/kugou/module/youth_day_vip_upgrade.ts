import type { KugouParams, UseAxios } from '../util/types';

//升级vip
export default (params: KugouParams, useAxios: UseAxios) => {
  const paramsMap: Record<string, any> = {
    kugouid: Number(params?.userid || params?.cookie?.userid || 0),
    ad_type: 1,
  }


  

  return useAxios({
    url: '/youth/v1/listen_song/upgrade_vip_reward',
    encryptType: 'android',
    method: 'post',
    params: paramsMap,
    cookie: params?.cookie,
  });
};
