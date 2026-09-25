import type { KugouParams, UseAxios } from '../util/types';

// 歌词搜索
import { appid, clientver } from '../util';

export default (params: KugouParams, useAxios: UseAxios) => {
  const dataMap: Record<string, any> = {
    album_audio_id: params?.album_audio_id || 0,
    appid,
    clientver,
    duration: params.duration || 0,
    hash: params?.hash || '',
    keyword: params?.keywords || '',
    lrctxt: 1,
    man: params.man ?? 'no',
  };

  return useAxios({
    baseURL: 'https://lyrics.kugou.com',
    url: '/v1/search',
    method: 'GET',
    params: dataMap,
    cookie: params?.cookie || {},
    encryptType: 'android',
    clearDefaultParams: true,
    notSign: true,
  });
};
