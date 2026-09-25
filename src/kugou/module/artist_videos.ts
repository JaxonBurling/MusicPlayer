import type { KugouParams, UseAxios } from '../util/types';

// 获取歌手mv

const tag_idx: Record<string, any> = { official: 18, live: 20, fan: 23, artist: 42419, all: '' };

export default (params: KugouParams, useAxios: UseAxios) => {
  const paramsMap: Record<string, any> = {
    author_id: params.id,
    is_fanmade: '',
    tag_idx: tag_idx[params?.tag || 'all'] || '', // 18:官方版本，20：现场版本，23：饭制版本，42419：歌手发布
    pagesize: params.pagesize || 30,
    page: params.page || 1,
  };

  return useAxios({
    baseURL: 'https://openapicdn.kugou.com',
    url: '/kmr/v1/author/videos',
    method: 'GET',
    params: paramsMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
