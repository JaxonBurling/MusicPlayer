import type { KugouParams, UseAxios } from '../util/types';

//登出选定设备
import { calculateMid, cryptoAesEncrypt, appid, clientver, srcappid, signParamsKey } from '../util';
export default (params: KugouParams, useAxios: UseAxios) => {
  const clienttime_ms = Date.now();
  const encrypt = cryptoAesEncrypt({ token: params.token || params.cookie?.token });
  const guid = params.guid || params.cookie?.KUGOU_API_GUID || '';
  const uuid = params.uuid || params.cookie?.uuid || guid;
  const dfid = params.dfid || params.cookie?.dfid || '-';
  const userid = params.userid || params.cookie?.userid || 0;
  const mid = calculateMid(params.mid || guid);
  const dateTime = Date.now();
  const dataMap: Record<string, any> = {
    appid,
    clientver,
    clienttime: clienttime_ms,
    mid: mid,
    uuid,
    dfid,
    plat: 1,
    userid,
    token: encrypt,
    t_mid :guid,
    t : dateTime,
    t_appid: 3116,
    t_clientver: 10597,
    srcappid,
    signature: signParamsKey(dateTime),
  };

return useAxios({
    url: '/loginservice/v1/dev_logout',
    encryptType: 'android',
    method: 'GET',
    data: dataMap,
    cookie: params?.cookie,
    headers: { 'Host':'gateway.kugou.com'}
  });
};