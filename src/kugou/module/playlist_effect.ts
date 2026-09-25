import type { KugouParams, UseAxios } from '../util/types';

// 获取音效歌单

export default (params: KugouParams, useAxios: UseAxios) => {
  const dataMap: Record<string, any> = {
    page: params?.page || 1,
    pagesize: params?.pagesize || 30,
  };

  return useAxios({
    url: '/pubsongs/v1/get_sound_effect_list',
    method: 'POST',
    encryptType: 'android',
    data: dataMap,
    cookie: params?.cookie || {},
  });
};
