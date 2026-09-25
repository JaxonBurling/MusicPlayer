import type { KugouParams, UseAxios } from '../util/types';

import { cryptoAesEncrypt, cryptoRSAEncrypt } from '../util';

export default (params: KugouParams, useAxios: UseAxios) => {
  const clienttime_ms = Date.now();
  const encrypt = cryptoAesEncrypt({ token: params.token || params.cookie?.token });
  const dataMap: Record<string, any> = {
    plat: 1,
    userid: params.userid || params.cookie?.userid || 0,
    clienttime_ms,
    pk: cryptoRSAEncrypt({ clienttime_ms, key: encrypt.key }).toUpperCase(),
    params: encrypt.str,
  };

  return useAxios({
    baseURL: 'https://userinfoservice.kugou.com',
    url: '/v2/get_dev',
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    cookie: params?.cookie || {},
  });
};
