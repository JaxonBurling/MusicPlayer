import type { KugouParams, UseAxios } from '../util/types';

export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: `/longaudio/v1/home_new/rank_card_recommend`,
    method: 'get',
    encryptType: 'android',
    params: {platform: 'ios'},
    cookie: params?.cookie || {},
  });
};
