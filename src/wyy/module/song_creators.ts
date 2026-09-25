import type { WyyQuery, WyyRequest } from '../util/types';

// 歌曲创作者信息

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songId: query.id,
  }
  return request(`/api/song/creators`, data, createOption(query))
}
