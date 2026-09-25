import type { WyyQuery, WyyRequest } from '../util/types';

// 历史每日推荐歌曲

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/discovery/recommend/songs/history/recent`,
    data,
    createOption(query, 'weapi'),
  )
}
