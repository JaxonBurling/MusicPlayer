import type { KugouParams, UseAxios } from '../util/types';


import axios from 'axios';

export default (params: KugouParams, _useAxios: UseAxios) => {
  const answer = { status: 500, body: {}, cookie: [] };
  return new Promise(async (resolve: any, reject: any) => {
    try {
      const resp = await axios({ url: `https://long.open.weixin.qq.com/connect/l/qrconnect?f=json&uuid=${params?.uuid || ''}` });

      answer.status = 200;
      answer.body = resp.data;

      resolve(answer);
    } catch (err) {
      answer.status = 502;
      answer.body = { status: 0, msg: err };
      reject(answer);
    }
  });
}
