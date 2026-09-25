import type { KugouParams, UseAxios } from '../util/types';

import { appid, clientver } from '../util';

export default (params: KugouParams, useAxios: UseAxios) => {
  const userid = params?.userid || params?.cookie?.userid || 0;
  const token = params?.token || params.cookie?.token || '';

  const dataMap: Record<string, any> = {
    appid,
    clientver,
    token,
    userid,
  };

  return useAxios({
    url: '/scene/v1/scene/audio_list',
    method: 'POST',
    encryptType: 'android',
    params: { scene_id: params.id, module_id: params.module_id, tag: params.tag, page: params.page || 1, page_size: params.pagesize || 30 },
    data: dataMap,
    cookie: params?.cookie || {},
  });
};
