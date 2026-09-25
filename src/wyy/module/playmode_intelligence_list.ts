import type { WyyQuery, WyyRequest } from '../util/types';

// 智能播放

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songId: query.id,
    type: 'fromPlayOne',
    playlistId: query.pid,
    startMusicId: query.sid || query.id,
    count: query.count || 1,
  }
  return request(`/api/playmode/intelligence/list`, data, createOption(query))
}
