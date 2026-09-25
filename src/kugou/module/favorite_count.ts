import type { KugouParams, UseAxios } from '../util/types';

export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: `/count/v1/audio/mget_collect`,
    method: 'GET',
    encryptType: 'android',
    cookie: params?.cookie || {},
    params: { mixsongids: params.mixsongids },
  });
};
