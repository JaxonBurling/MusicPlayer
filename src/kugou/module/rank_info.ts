import type { KugouParams, UseAxios } from '../util/types';

// 获取排行榜详情
export default (params: KugouParams, useAxios: UseAxios) => {
  const parmasMap: Record<string, any> = {
    rank_cid: params.rank_cid || 0,
    rankid: params.rankid,
    with_album_img: params.album_img || 1,
    zone: params.zone || '',
  };

  return useAxios({
    url: '/ocean/v6/rank/info',
    method: 'get',
    encryptType: 'android',
    params: parmasMap,
    cookie: params?.cookie || {},
  });
};
