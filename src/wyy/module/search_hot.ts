import type { WyyQuery, WyyRequest } from '../util/types';

// 热门搜索

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    type: 1111,
  }
  return request(`/api/search/hot`, data, createOption(query))
}
