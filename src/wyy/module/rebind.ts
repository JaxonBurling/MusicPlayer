import type { WyyQuery, WyyRequest } from '../util/types';

// 更换手机

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    captcha: query.captcha,
    phone: query.phone,
    oldcaptcha: query.oldcaptcha,
    ctcode: query.ctcode || '86',
  }
  return request(
    `/api/user/replaceCellphone`,
    data,
    createOption(query, 'weapi'),
  )
}
