import type { KugouParams, UseAxios } from '../util/types';

// 每日推荐歌曲

export default (params: KugouParams, useAxios: UseAxios) => {
  const dataMap: Record<string, any> = {
    platform: params?.platform || 'android',
    userid: params?.userid || params?.cookie?.userid || '0',
  };

  return useAxios({
    url: '/everyday_song_recommend',
    method: 'POST',
    data: dataMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
    headers: { 'x-router': 'everydayrec.service.kugou.com' },
  });
};
