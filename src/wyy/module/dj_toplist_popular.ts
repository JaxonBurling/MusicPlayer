import type { WyyQuery, WyyRequest } from '../util/types';

// 电台最热主播榜

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 100,
    // 不支持 offset
  }
  return request(`/api/dj/toplist/popular`, data, createOption(query, 'weapi'))
}
