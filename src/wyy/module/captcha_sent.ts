import type { WyyQuery, WyyRequest } from '../util/types';

// 发送验证码

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    ctcode: query.ctcode || '86',
    secrete: 'music_middleuser_pclogin',
    cellphone: query.phone,
  }
  return request(`/api/sms/captcha/sent`, data, createOption(query, 'weapi'))
}
