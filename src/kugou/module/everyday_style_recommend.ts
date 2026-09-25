import type { KugouParams, UseAxios } from '../util/types';

export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/everydayrec.service/everyday_style_recommend',
    encryptType: 'android',
    method: 'POST',
    data: {},
    params: { tagids: params.tagids ?? ''},
    cookie: params?.cookie || {},
  });
};
