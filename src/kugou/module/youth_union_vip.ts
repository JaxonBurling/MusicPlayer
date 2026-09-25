import type { KugouParams, UseAxios } from '../util/types';

// 领取vip 需要登录
export default (params: KugouParams, useAxios: UseAxios) => {
 const paramsMap: Record<string, any> = {
  busi_type: 'concept',
  opt_product_types: 'dvip,qvip',
  product_type: 'svip',
 }

  return useAxios({
    baseURL: 'https://kugouvip.kugou.com',
    url: '/v1/get_union_vip',
    encryptType: 'android',
    method: 'get',
    params: paramsMap,
    cookie: params?.cookie,
  });
};
