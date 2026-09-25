import type { WyyQuery, WyyRequest } from '../util/types';

// 热门歌手

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 50,
    offset: query.offset || 0,
    total: true,
  }
  return request(`/api/artist/top`, data, createOption(query, 'weapi'))
}
