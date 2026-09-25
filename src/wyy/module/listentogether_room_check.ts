import type { WyyQuery, WyyRequest } from '../util/types';

// 一起听 房间情况

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    roomId: query.roomId,
  }
  return request(`/api/listen/together/room/check`, data, createOption(query))
}
