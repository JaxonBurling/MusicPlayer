import type { WyyQuery, WyyRequest } from '../util/types';

// 一起听 发送播放状态

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    roomId: query.roomId,
    commandInfo: JSON.stringify({
      commandType: query.commandType,
      progress: query.progress || 0,
      playStatus: query.playStatus,
      formerSongId: query.formerSongId,
      targetSongId: query.targetSongId,
      clientSeq: query.clientSeq,
    }),
  }
  return request(
    `/api/listen/together/play/command/report`,
    data,
    createOption(query),
  )
}
