import type { WyyQuery, WyyRequest } from '../util/types';

// 一起听 发送心跳

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    roomId: query.roomId,
    songId: query.songId,
    playStatus: query.playStatus,
    progress: query.progress,
  }
  return request(`/api/listen/together/heartbeat`, data, createOption(query))
}
