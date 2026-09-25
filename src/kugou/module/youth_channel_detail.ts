import type { KugouParams, UseAxios } from '../util/types';

export default (params: KugouParams, useAxios: UseAxios) => {
  const data = (params.global_collection_id || '').split(',').map((s: any) => ({ global_collection_id: s }));
  return useAxios({
    url: '/youth/api/channel/v1/channel_list_by_id',
    encryptType: 'android',
    method: 'post',
    data: { data },
    cookie: params?.cookie,
  });
};
