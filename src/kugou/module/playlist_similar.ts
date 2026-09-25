import type { KugouParams, UseAxios } from '../util/types';

import { appid, clientver, signParamsKey } from '../util';

export default (params: KugouParams, useAxios: UseAxios) => {
  const data = (params?.ids || '').split(',').map((s: any) => ({ 'global_collection_id': s }));
  const clienttime = Date.now();

  const dataMap: Record<string, any> = {
    appid,
    clientver,
    clienttime,
    key: signParamsKey(clienttime),
    userid: params?.userid || params?.cookie?.userid || 0,
    ugc: 1,
    show_list: 1,
    need_songs: 1,
    data,
  };

  return useAxios({
    url: '/pubsongs/v1/kmr_get_similar_lists',
    method: 'POST',
    encryptType: 'android',
    data: dataMap,
    cookie: params?.cookie || {},
  });
};
