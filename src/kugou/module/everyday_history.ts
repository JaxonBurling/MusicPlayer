import type { KugouParams, UseAxios } from '../util/types';

// mode list ,song

export default (params: KugouParams, useAxios: UseAxios) => {
  const paramsMap: Record<string, any> = {
   mode: params.mode || 'list',
   platform: params.platform || 'ios' 
  };

  if (params.history_name) paramsMap['history_name'] = params.history_name;
  if (params.date) paramsMap['date'] = params.date;

  return useAxios({
    url: '/everyday/api/v1/get_history',
    encryptType: 'android',
    method: 'POST',
    params: paramsMap,
    cookie: params?.cookie || {},
    headers: { 'x-router': 'everydayrec.service.kugou.com' },
  });
};
