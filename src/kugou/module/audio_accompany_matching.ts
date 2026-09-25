import type { KugouParams, UseAxios } from '../util/types';

import { cryptoMd5, appid } from '../util';

export default (params: KugouParams, useAxios: UseAxios) => {

  const dataMap: Record<string, any> = {
    isteen: 0,
    mixId: Number(params.mixId) || 0,
    usemkv: 1,
    platform: 2,
    fileName: params.fileName || '',
    hash: params.hash,
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
    baseURL: 'https://nsongacsing.kugou.com',
    url: '/sing7/accompanywan/json/v2/cdn/optimal_matching_accompany_2_listen.do',
    params: dataMap,
    method: 'get',
    encryptType: 'android',
    cookie: params?.cookie || {},
    clearDefaultParams: true,
    notSignature: true,
  });
};
