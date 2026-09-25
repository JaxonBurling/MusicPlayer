import type { WyyQuery, WyyRequest } from '../util/types';

// 注册账号
import CryptoJS from '../util/cryptojs';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    captcha: query.captcha,
    phone: query.phone,
    password: CryptoJS.MD5(query.password).toString(),
    nickname: query.nickname,
    countrycode: query.countrycode || '86',
    force: 'false',
  }
  return request(`/api/w/register/cellphone`, data, createOption(query))
}
