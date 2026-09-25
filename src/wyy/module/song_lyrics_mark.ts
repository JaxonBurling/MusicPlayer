import type { WyyQuery, WyyRequest } from '../util/types';

// 歌词摘录 - 歌词摘录信息

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songId: query.id,
  }
  return request(`/api/song/play/lyrics/mark/song`, data, createOption(query))
}
