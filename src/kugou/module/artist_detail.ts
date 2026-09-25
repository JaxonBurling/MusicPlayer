import type { KugouParams, UseAxios } from '../util/types';

// 歌手详情
export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/kmr/v3/author',
    method: 'POST',
    data: { author_id: params.id },
    encryptType: 'android',
    cookie: params?.cookie || {},
    headers: { 'x-router': 'openapi.kugou.com', 'kg-tid': 36 },
  });
};
