import type { KugouParams, UseAxios } from '../util/types';

// 歌词获取
import { decodeLyrics } from '../util';

export default (params: KugouParams, useAxios: UseAxios) => {
  const dataMap: Record<string, any> = {
    ver: 1,
    client: params?.client || 'android',
    id: params?.id,
    accesskey: params?.accesskey,
    fmt: params.fmt || 'krc',
    charset: 'utf8',
  };

  return new Promise((resolve: any, reject: any) => {
    useAxios({
		  baseURL: 'https://lyrics.kugou.com',
		  url: '/download',
      method: 'GET',
      params: dataMap,
      cookie: params?.cookie || {},
      encryptType: 'android',
    })
      .then((res: any) => {
        if (params?.decode) {
          if (res.body?.content) {
            res.body['decodeContent'] = params?.fmt == 'lrc' || Number(res.body?.contenttype) !== 0 ? Buffer.from(res.body?.content, 'base64').toString() : decodeLyrics(res.body.content);
            resolve(res);
            return;
          }
        }
        resolve(res);
      })
      .catch((e: any) => reject(e));
  });
};
