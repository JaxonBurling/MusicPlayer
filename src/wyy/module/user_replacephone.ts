import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    phone: query.phone,
    captcha: query.captcha,
    oldcaptcha: query.oldcaptcha,
    countrycode: query.countrycode || '86',
  }
  return request(
    `/api/user/replaceCellphone`,
    data,
    createOption(query, 'weapi'),
  )
}
