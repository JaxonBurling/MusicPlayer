import type { KugouParams, UseAxios } from '../util/types';

export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/youth/api/amway/v2/index',
    encryptType: 'android',
    method: 'get',
    params: { global_collection_id: params.global_collection_id },
    cookie: params?.cookie,
  });
};
