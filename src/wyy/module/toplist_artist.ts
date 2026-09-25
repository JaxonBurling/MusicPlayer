import type { WyyQuery, WyyRequest } from '../util/types';

// 歌手榜

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    type: query.type || 1,
    limit: 100,
    offset: 0,
    total: true,
  }
  return request(`/api/toplist/artist`, data, createOption(query, 'weapi'))
}
