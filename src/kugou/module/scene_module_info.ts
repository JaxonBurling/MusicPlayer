import type { KugouParams, UseAxios } from '../util/types';

export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/scene/v1/scene/module_info',
    params: { scene_id: params.id, module_id: params.module_id },
    method: 'GET',
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
