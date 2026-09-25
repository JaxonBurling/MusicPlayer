import type { KugouParams, UseAxios } from '../util/types';

// 主题歌单
import { clientver } from '../util';
export default (params: KugouParams, useAxios: UseAxios) => {
  const dataMap: Record<string, any> = {
    platform: 'android',
    clientver,
    clienttime: Date.now(),
    area_code: 1,
    module_id: 1,
    userid: params?.userid || params?.cookie?.userid || 0,
  };

  return useAxios({
    url: '/v2/getthemelist',
    method: 'POST',
    encryptType: 'android',
    data: dataMap,
    cookie: params?.cookie || {},
    headers: { 'x-router': 'everydayrec.service.kugou.com' },
  });
};
