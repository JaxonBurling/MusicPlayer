import type { KugouParams, UseAxios } from '../util/types';

import { appid, clientver, signParamsKey } from '../util';
export default (params: KugouParams, useAxios: UseAxios) => {
  const dateTime = Date.now();
  const dataMap: Record<string, any> = {
    appid,
    clientver,
    clienttime: dateTime,
    mid: params?.cookie?.KUGOU_API_MID,
    key: signParamsKey(dateTime),
    rcmdsongcount: 1,
    level: 0,
    area_code: 1,
    get_tracker: 1,
    uid: 0,
  };

  return useAxios({
    url: '/v1/rcmd_list',
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    cookie: params?.cookie || {},
    headers: { 'x-router': 'fm.service.kugou.com' },
  });
};
