import type { WyyQuery, WyyRequest } from '../util/types';

import CryptoJS from '../util/cryptojs';
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    phone: query.phone,
    countrycode: query.countrycode || '86',
    captcha: query.captcha,
    password: query.password ? CryptoJS.MD5(query.password).toString() : '',
  }
  return request(
    `/api/user/bindingCellphone`,
    data,
    createOption(query, 'weapi'),
  )
}
