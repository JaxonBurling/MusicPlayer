import type { KugouParams, UseAxios } from '../util/types';

export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/everyday_song_recommend',
    encryptType: 'android',
    method: 'POST',
    params: { platform: params.platform || 'ios' },
    cookie: params?.cookie || {},
    headers: { 'x-router': 'everydayrec.service.kugou.com' },
  });
};
