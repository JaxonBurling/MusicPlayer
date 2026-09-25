import type { WyyQuery, WyyRequest } from '../util/types';

// 歌词摘录 - 删除摘录歌词

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    markIds: query.id,
  }
  return request(`/api/song/play/lyrics/mark/del`, data, createOption(query))
}
