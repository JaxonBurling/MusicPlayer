import type { WyyQuery, WyyRequest } from '../util/types';

// 热门电台

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 30,
    offset: query.offset || 0,
  }
  return request(`/api/djradio/hot/v1`, data, createOption(query, 'weapi'))
}
