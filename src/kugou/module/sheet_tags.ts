import type { KugouParams, UseAxios } from '../util/types';


// 获取乐谱 tag
export default (params: KugouParams, useAxios: UseAxios) => {
  return useAxios({
    url: '/opern/v1/home/get_tags',
    encryptType: 'android',
    method: 'GET',
    cookie: params?.cookie || {},
  });
};

