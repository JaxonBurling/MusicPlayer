import type { WyyQuery, WyyRequest } from '../util/types';

// 类别热门电台

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    cateId: query.cateId,
    limit: query.limit || 30,
    offset: query.offset || 0,
  }
  return request(`/api/djradio/hot`, data, createOption(query, 'weapi'))
}
