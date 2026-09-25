import type { WyyQuery, WyyRequest } from '../util/types';

// 一起听 当前列表获取

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    roomId: query.roomId,
  }
  return request(
    `/api/listen/together/sync/playlist/get`,
    data,
    createOption(query),
  )
}
