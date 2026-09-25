import type { WyyQuery, WyyRequest } from '../util/types';

// 一起听 更新播放列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    roomId: query.roomId,
    playlistParam: JSON.stringify({
      commandType: query.commandType,
      version: [
        {
          userId: query.userId,
          version: query.version,
        },
      ],
      anchorSongId: '',
      anchorPosition: -1,
      randomList: query.randomList.split(','),
      displayList: query.displayList.split(','),
    }),
  }
  return request(
    `/api/listen/together/sync/list/command/report`,
    data,
    createOption(query),
  )
}
