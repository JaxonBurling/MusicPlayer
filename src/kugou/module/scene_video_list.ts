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
    tag_id: params.tag_id,
    page: params.page || 1,
    page_size: params.pagesize || 30,
    exposed_data: [],
  };

  return useAxios({
    url: '/scene/v1/distribution/video_list',
    method: 'POST',
    encryptType: 'android',
    data: dataMap,
    cookie: params?.cookie || {},
  });
};
