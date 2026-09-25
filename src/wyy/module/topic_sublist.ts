import type { WyyQuery, WyyRequest } from '../util/types';

// 收藏的专栏

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 50,
    offset: query.offset || 0,
    total: true,
  }
  return request(`/api/topic/sublist`, data, createOption(query, 'weapi'))
}
