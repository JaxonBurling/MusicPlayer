import type { WyyQuery, WyyRequest } from '../util/types';

// 一起听 结束房间

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    roomId: query.roomId,
  }
  return request(`/api/listen/together/end/v2`, data, createOption(query))
}
