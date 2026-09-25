import type { KugouParams, UseAxios } from '../util/types';

// 获取音频高潮部分

export default (params: KugouParams, useAxios: UseAxios) => {
  const data = (params?.hash || '').split(',').map((s: any) => ({ hash: s }));

  return useAxios({
    baseURL: 'https://expendablekmrcdn.kugou.com',
    url: '/v1/audio_climax/audio',
    method: 'GET',
    params: { data: JSON.stringify(data) },
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
