import type { WyyQuery, WyyRequest } from '../util/types';

// 歌词

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    tv: -1,
    lv: -1,
    rv: -1,
    kv: -1,
    _nmclfl: 1,
  }
  return request(`/api/song/lyric`, data, createOption(query))
}
