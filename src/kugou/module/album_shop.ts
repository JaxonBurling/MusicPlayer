import type { KugouParams, UseAxios } from '../util/types';

// 唱片店
export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/zhuanjidata/v3/album_shop_v2/get_classify_data',
    method: 'GET',
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
