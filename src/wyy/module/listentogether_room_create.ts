import type { WyyQuery, WyyRequest } from '../util/types';

// 一起听创建房间

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    refer: 'songplay_more',
  }
  return request(`/api/listen/together/room/create`, data, createOption(query))
}
