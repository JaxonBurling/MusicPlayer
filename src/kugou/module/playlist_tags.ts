import type { KugouParams, UseAxios } from '../util/types';

// 获取歌单分类

export default (params: KugouParams, useAxios: UseAxios) => {
  const dataMap: Record<string, any> = {
    tag_type: 'collection',
    tag_id: 0,
    source: 3,
  };

  return useAxios({
    url: '/pubsongs/v1/get_tags_by_type',
    method: 'POST',
    encryptType: 'android',
    data: dataMap,
    cookie: params?.cookie || {},
  });
};
