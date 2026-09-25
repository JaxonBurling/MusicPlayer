import type { WyyQuery, WyyRequest } from '../util/types';

// 歌曲是否喜爱

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    trackIds: query.ids,
  }
  return request(`/api/song/like/check`, data, createOption(query))
}
