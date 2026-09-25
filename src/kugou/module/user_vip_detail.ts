import type { KugouParams, UseAxios } from '../util/types';

export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    baseURL: 'https://kugouvip.kugou.com',
    url: '/v1/get_union_vip',
    method: 'GET',
    params: {busi_type: 'concept'},
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
