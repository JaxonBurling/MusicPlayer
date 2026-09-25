import type { KugouParams, UseAxios } from '../util/types';

// 获取乐库下的 fm

export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/v1/time_fm_info',
    encryptType: 'android',
    method: 'GET',
    params: { operator: 7, plat: 0, type: 11, area_code: 1, req_multi: 1 },
    cookie: params?.cookie || {},
    headers: { 'x-router': 'fm.service.kugou.com' },
  });
};
