import type { KugouParams, UseAxios } from '../util/types';

/**
 * 获取用户关注的歌手
 */
export default (params: KugouParams, useAxios: UseAxios) => {
  const token = params?.token || params?.cookie?.token || '';
  const userid = params?.userid || params?.cookie?.userid || '0';
  const dataMap: Record<string, any> = {
    userid,
    token,
    page: params?.page ?? 1,
    pagesize: params?.pagesize ?? 30,
  };

  return useAxios({
    url: '/collectservice/v2/collect_list_mixvideo',
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    params: { plat: 1 },
    cookie: params?.cookie || {},
  });
};
