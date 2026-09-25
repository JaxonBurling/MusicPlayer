import type { WyyQuery, WyyRequest } from '../util/types';

// 歌单收藏者

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    limit: query.limit || 20,
    offset: query.offset || 0,
  }
  return request(`/api/playlist/subscribers`, data, createOption(query))
}
