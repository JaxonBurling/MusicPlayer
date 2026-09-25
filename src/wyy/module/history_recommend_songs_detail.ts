import type { WyyQuery, WyyRequest } from '../util/types';

// 历史每日推荐歌曲详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    date: query.date || '',
  }
  return request(
    `/api/discovery/recommend/songs/history/detail`,
    data,
    createOption(query, 'weapi'),
  )
}
