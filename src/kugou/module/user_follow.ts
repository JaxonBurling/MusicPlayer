import type { KugouParams, UseAxios } from '../util/types';

import { cryptoRSAEncrypt } from '../util';
/**
 * 获取用户关注的歌手
 */
export default (params: KugouParams, useAxios: UseAxios) => {
  const token = params?.token || params?.cookie?.token || '';
  const userid = params?.userid || params?.cookie?.userid || '0';
  const dateTime = Math.floor(Date.now() / 1000);
  const dataMap: Record<string, any> = {
    merge: 2,
    need_iden_type: 1,
    ext_params: 'k_pic,jumptype,singerid,score',
    userid,
    type: 0,
    id_type: 0,
    p: cryptoRSAEncrypt({ clienttime: dateTime, token }).toUpperCase(),
  };

  return useAxios({
    url: '/v4/follow_list',
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    params: { plat: 1 },
    cookie: params?.cookie || {},
    headers: { 'x-router': 'relationuser.kugou.com' },
  });
};
