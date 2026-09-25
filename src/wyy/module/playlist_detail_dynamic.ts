import type { WyyQuery, WyyRequest } from '../util/types';

// 歌单动态信息

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    n: 100000,
    s: query.s || 8,
  }
  return request(`/api/playlist/detail/dynamic`, data, createOption(query))
}
