import type { KugouParams, UseAxios } from '../util/types';

// 专辑音乐列表
export default (params: KugouParams, useAxios: UseAxios) => {
  const dataMap: Record<string, any> = {
    album_id: params.id,
    is_buy:  params?.is_buy || '',
    page: params?.page || 1,
    pagesize: params?.pagesize || 30,
  };

  return useAxios({
    url: '/v1/album_audio/lite',
    method: 'POST',
    data: dataMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
    headers: { 'x-router': 'openapi.kugou.com', 'kg-tid': '255' },
  });
}