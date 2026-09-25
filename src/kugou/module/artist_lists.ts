import type { KugouParams, UseAxios } from '../util/types';

// 歌手列表
export default (params: KugouParams, useAxios: UseAxios) => {
  const paramsMap: Record<string, any> = {
    musician: Number(params.musician || 0),
    sextype: params.sextypes || 0,
    showtype: 2,
    type: params.type || 0,
    hotsize:  Number(params.hotsize || 30)
  };

  return useAxios({
    url: '/ocean/v6/singer/list',
    method: 'GET',
    params: paramsMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
