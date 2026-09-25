import type { KugouParams, UseAxios } from '../util/types';

// 推荐专辑
import { apiver } from '../util';

export default (params: KugouParams, useAxios: UseAxios) => {
  const dataMap: Record<string, any> = {
    apiver,
    token: params?.token || params?.cookie?.token || '',
    page: params?.page || 1,
    pagesize: params?.pagesize || 30,
    withpriv: 1,
  };

  return useAxios({
    url: '/musicadservice/v1/mobile_newalbum_sp',
    method: 'POST',
    data: dataMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
