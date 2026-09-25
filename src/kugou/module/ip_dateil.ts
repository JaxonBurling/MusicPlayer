import type { KugouParams, UseAxios } from '../util/types';

// 获取ip详情
export default (params: KugouParams, useAxios: UseAxios) => {
  const data = (params?.id || '').split(',').map((s: any) => ({ ip_id: s }));

  const dataMap: Record<string, any> = {
    data,
    is_publish: 1,
  };

  return useAxios({
    url: '/openapi/v1/ip',
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    cookie: params?.cookie || {},
  });
};
