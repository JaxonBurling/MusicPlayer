import type { WyyQuery, WyyRequest } from '../util/types';

// 推荐歌单

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 30,
    // offset: query.offset || 0,
    total: true,
    n: 1000,
  }
  return request(
    `/api/personalized/playlist`,
    data,
    createOption(query, 'weapi'),
  )
}
