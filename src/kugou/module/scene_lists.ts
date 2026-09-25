import type { KugouParams, UseAxios } from '../util/types';

export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/scene/v1/scene/list',
    method: 'GET',
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
