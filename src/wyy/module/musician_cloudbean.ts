import type { WyyQuery, WyyRequest } from '../util/types';

// 账号云豆数

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/cloudbean/get`, data, createOption(query, 'weapi'))
}
