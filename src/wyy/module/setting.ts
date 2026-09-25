import type { WyyQuery, WyyRequest } from '../util/types';

// 设置

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/user/setting`, data, createOption(query, 'weapi'))
}
