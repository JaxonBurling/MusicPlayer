import type { KugouParams, UseAxios } from '../util/types';

/**
 * 新歌速递
 */
export default (params: KugouParams, useAxios: UseAxios) => {
  const dataMap: Record<string, any> = {
    rank_id: params?.type || 21608,
    userid: params?.userid || params?.cookie?.userid || 0,
    page: params?.page || 1,
    pagesize: params?.pagesize || 30,
    tags: [],
  };

  return useAxios({
    url: '/musicadservice/container/v1/newsong_publish',
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    cookie: params?.cookie || {},
  });
};
