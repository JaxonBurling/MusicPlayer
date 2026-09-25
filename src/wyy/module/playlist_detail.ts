import type { WyyQuery, WyyRequest } from '../util/types';

// 歌单详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    n: 100000,
    s: query.s || 8,
  }
  return request(`/api/v6/playlist/detail`, data, createOption(query))
}
