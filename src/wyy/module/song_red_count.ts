import type { WyyQuery, WyyRequest } from '../util/types';

// 歌曲红心数量

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songId: query.id,
  }
  return request(`/api/song/red/count`, data, createOption(query))
}
