import type { KugouParams, UseAxios } from '../util/types';

// 获取歌手列表
export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/ocean/v6/singer/list',
    encryptType: 'android',
    method: 'GET',
    params: {
      hotsize: params?.hotsize ?? 200,
      musician: 0,
      sextype: params?.sextype ?? 0,
      showtype: 2,
      type: params?.type ?? 0,
    },
    cookie: params?.cookie || {},
  });
};
