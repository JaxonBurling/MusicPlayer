import type { KugouParams, UseAxios } from '../util/types';

import { srcappid } from '../util';
// 乐谱详情
export default (params: KugouParams, useAxios: UseAxios) => {
  const paramsMap: Record<string, any> = {
    srcappid,
    position: params.position ?? 2
  }
  return useAxios({
    url: '/miniyueku/v1/opern_square/get_home_module_config',
    encryptType: 'web',
    method: 'GET',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
