import type { KugouParams, UseAxios } from '../util/types';

// 获取歌单详情

export default (params: KugouParams, useAxios: UseAxios) => {
  const data = (params?.ids || '').split(',').map((s: any) => ({'global_collection_id': s }));
  
  const dataMap: Record<string, any> = {
    data,
    userid: params?.userid || params?.cookie?.userid || 0,
    token: params?.token || params?.cookie?.token || ''
  };

  return useAxios({
    url: '/v3/get_list_info',
    method: 'POST',
    encryptType: 'android',
    data: dataMap,
    cookie: params?.cookie || {},
    headers: {'x-router': 'pubsongs.kugou.com'}
  })


}