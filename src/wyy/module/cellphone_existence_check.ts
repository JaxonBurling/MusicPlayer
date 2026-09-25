import type { WyyQuery, WyyRequest } from '../util/types';

// 检测手机号码是否已注册

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    cellphone: query.phone,
    countrycode: query.countrycode,
  }
  return request(`/api/cellphone/existence/check`, data, createOption(query))
}
