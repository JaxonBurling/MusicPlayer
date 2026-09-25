import type { KugouParams, UseAxios } from '../util/types';

// 热搜
export default (params: KugouParams, useAxios: UseAxios) => {
  const dataMap: Record<string, any> = {
    navid: 1,
    plat: 2,
  };

  return useAxios({
    url: '/api/v3/search/hot_tab',
    method: 'GET',
    params: dataMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
    headers: {'x-router': 'msearch.kugou.com'}
  });
};
