import type { KugouParams, UseAxios } from '../util/types';

// 乐谱详情
export default (params: KugouParams, useAxios: UseAxios) => {
  const paramsMap: Record<string, any> = {
    opern_id: params.id,
  }
  return useAxios({
    url: '/opern/v1/detail/info',
    encryptType: 'android',
    method: 'GET',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
