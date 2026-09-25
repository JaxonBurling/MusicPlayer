import type { WyyQuery, WyyRequest } from '../util/types';

// 每日推荐歌曲

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    afresh: query.afresh,
  }
  return request(
    `/api/v3/discovery/recommend/songs`,
    data,
    createOption(query, 'weapi'),
  )
}
