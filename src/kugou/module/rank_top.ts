import type { KugouParams, UseAxios } from '../util/types';

// 获取排行榜推荐列表

export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/mobileservice/api/v5/rank/rec_rank_list',
    method: 'get',
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
