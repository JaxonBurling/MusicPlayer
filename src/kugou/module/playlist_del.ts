import type { KugouParams, UseAxios } from '../util/types';

import { playlistAesEncrypt, playlistAesDecrypt, rsaEncrypt2, signParamsKey, clientver, appid } from '../util';

// 取消收藏歌单
export default (params: KugouParams, useAxios: UseAxios) => {
  const answer = { status: 500, body: {} as any, cookie: [] };
  return new Promise(async (resolve: any) => {
    try {
      const userid = params?.userid || params?.cookie?.userid || 0;
      const token = params?.token || params.cookie?.token || '';
      const clienttime = Math.floor(Date.now() / 1000);

      const dataMap: Record<string, any> = {
        listid: Number(params.listid),
        total_ver: 0,
        type: 1,
      };

      const aesEncrypt = playlistAesEncrypt(dataMap);

      const p = rsaEncrypt2({ aes: aesEncrypt.key, uid: userid, token }).toUpperCase();

      const paramsMap: Record<string, any> = {
        clienttime,
        key: signParamsKey(clienttime.toString()),
        last_area: 'gztx',
        clientver,
        appid,
        last_time: clienttime,
        p,
      };

      const respone = await useAxios({
        url: '/v2/delete_list',
        params: paramsMap,
        data: aesEncrypt.str,
        method: 'post',
        encryptType: 'android',
        headers: { 'x-router': 'cloudlist.service.kugou.com' },
        responseType: 'arraybuffer',
        cookie: params?.cookie || {},
      });

      respone.body = playlistAesDecrypt({ str: respone.body.toString('base64'), key: aesEncrypt.key });

      resolve(respone);
    } catch (error) {
      console.log(error);
      answer.body = error;
      resolve(answer);
    }
  });
};
