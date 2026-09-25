import type { WyyQuery, WyyRequest } from '../util/types';

// 每日推荐歌单

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/v1/discovery/recommend/resource`,
    {},
    createOption(query, 'weapi'),
  )
}
