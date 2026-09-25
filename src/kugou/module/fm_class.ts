import type { KugouParams, UseAxios } from '../util/types';

import { appid, clientver, signParamsKey } from '../util';
export default (params: KugouParams, useAxios: UseAxios) => {
  const dateTime = Date.now();
  const userid = params?.cookie?.userid || params?.userid || 0;
  const dataMap: Record<string, any> = {
    kguid: userid,
    clienttime: dateTime,
    mid: params?.cookie?.KUGOU_API_MID,
    platform: 'android',
    clientver,
    uid: userid,
    get_tracker: 1,
    key: signParamsKey(dateTime),
    appid,
  };

  return useAxios({
    url: '/v1/class_fm_song',
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    cookie: params?.cookie || {},
    headers: { 'x-router': 'fm.service.kugou.com' },
  });
};
