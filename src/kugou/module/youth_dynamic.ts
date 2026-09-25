import type { KugouParams, UseAxios } from '../util/types';


export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/youth/v3/user/get_dynamic',
    encryptType: 'android',
    method: 'get',
    cookie: params?.cookie,
  });
};
