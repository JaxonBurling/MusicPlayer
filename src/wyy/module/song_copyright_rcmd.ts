import type { WyyQuery, WyyRequest } from '../util/types';

// 灰色歌曲的其他版本推荐

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songid: query.songid || query.id,
  }
  return request(`/api/song/copyright/rcmd`, data, createOption(query, 'eapi'))
}
