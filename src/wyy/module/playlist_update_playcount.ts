import type { WyyQuery, WyyRequest } from '../util/types';

// 歌单打卡

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(`/api/playlist/update/playcount`, data, createOption(query))
}
