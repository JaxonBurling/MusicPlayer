import type { KugouParams, UseAxios } from '../util/types';

import { cryptoMd5, appid } from '../util';

export default (params: KugouParams, useAxios: UseAxios) => {

  const dataMap: Record<string, any> = {
    isteen: 0,
    songId: Number(params.songId),
    usemkv: 1,
    platform: 2,
    singerName: params.singerName,
    songHash: params.songHash,
    version: 12375,
    appid,
  }


  const str = '*s&iN#G70*';
  const paramsString = Object.keys(dataMap)
    .sort()
    .map((key: any) => `${key}=${typeof dataMap[key] === 'object' ? JSON.stringify(dataMap[key]) : dataMap[key]}`)
    .join('&');
  dataMap['sign'] = cryptoMd5(`${paramsString}${str}`).substring(8, 24);
  
  return useAxios({
    baseURL: 'https://acsing.service.kugou.com',
    url: '/sing7/listenguide/json/v2/cdn/listenguide/get_total_opus_num_v02.do',
    params: dataMap,
    method: 'get',
    encryptType: 'android',
    cookie: params?.cookie || {},
    clearDefaultParams: true,
    notSignature: true,
  });
};
