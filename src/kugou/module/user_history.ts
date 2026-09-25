import type { KugouParams, UseAxios } from '../util/types';

// 获取用户听歌排行
export default (params: KugouParams, useAxios: UseAxios) => {
  const userid = params?.userid || params?.cookie?.userid || 0;
  const token = params?.token || params?.cookie?.token || '';

  const dataMap: Record<string, any> = {  token, userid, source_classify: 'app',  to_subdivide_sr: 1 };

  if (params.bp) dataMap['bp'] = params.bp;

  return useAxios({
    url: '/playhistory/v1/get_songs',
    data: dataMap,
    encryptType: 'android',
    method: 'POST',
    cookie: params?.cookie || {},
  });

};
