import type { WyyQuery, WyyRequest } from '../util/types';

// 相关歌单推荐

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    scene: 'playlist_head',
    playlistId: query.id,
    newStyle: 'true',
  }
  return request(`/api/playlist/detail/rcmd/get`, data, createOption(query))
}
