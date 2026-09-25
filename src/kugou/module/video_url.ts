import type { KugouParams, UseAxios } from '../util/types';

// 获取视频urls
export default (params: KugouParams, useAxios: UseAxios) => {
  const paramsMap: Record<string, any> = {
    backupdomain: 1,
    cmd: 123,
    ext: 'mp4',
    ismp3: 0,
    hash: params.hash,
    pid: 1,
    type: 1,
  };

  return useAxios({
    url: '/v2/interface/index',
    method: 'GET',
    params: paramsMap,
    encryptType: 'android',
    encryptKey: true,
    headers: { 'x-router': 'trackermv.kugou.com' },
  });
};
