import type { WyyQuery, WyyRequest } from '../util/types';

// 校验验证码

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    ctcode: query.ctcode || '86',
    cellphone: query.phone,
    captcha: query.captcha,
  }
  return request(`/api/sms/captcha/verify`, data, createOption(query, 'weapi'))
}
