import type { WyyQuery, WyyRequest } from '../util/types';

// 歌曲动态封面

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songId: query.id,
  }
  return request(`/api/songplay/dynamic-cover`, data, createOption(query))
}
