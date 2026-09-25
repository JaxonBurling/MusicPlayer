import type { KugouParams, UseAxios } from '../util/types';

// 获取排行榜列表

export default (params: KugouParams, useAxios: UseAxios) => {
  const parmasMap: Record<string, any> = {
    plat: 2,
    withsong: params.withsong || 1,
    parentid: 0,
  };

  return useAxios({
    url: '/ocean/v6/rank/list',
    method: 'get',
    encryptType: 'android',
    params: parmasMap,
    cookie: params?.cookie || {},
  });
};
