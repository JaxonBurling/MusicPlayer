import type { KugouParams, UseAxios } from '../util/types';

// 获取排行榜往期列表
export default (params: KugouParams, useAxios: UseAxios) => {
  const parmasMap: Record<string, any> = {
    rank_cid: params.rank_cid || 0,
    rankid: params.rankid,
    ranktype: 1,
    type: 0,
    plat: 2,
  };

  return useAxios({
    url: '/ocean/v6/rank/vol',
    method: 'get',
    encryptType: 'android',
    params: parmasMap,
    cookie: params?.cookie || {},
  });
};
