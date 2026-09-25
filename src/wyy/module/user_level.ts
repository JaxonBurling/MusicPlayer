import type { WyyQuery, WyyRequest } from '../util/types';

// 类别热门电台

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/user/level`, data, createOption(query, 'weapi'))
}
