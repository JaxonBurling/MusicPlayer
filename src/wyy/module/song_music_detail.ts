import type { WyyQuery, WyyRequest } from '../util/types';

// 歌曲音质详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songId: query.id,
  }
  return request(`/api/song/music/detail/get`, data, createOption(query))
}
