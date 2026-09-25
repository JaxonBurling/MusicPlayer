import type { WyyQuery, WyyRequest } from '../util/types';

// 新版歌词 - 包含逐字歌词

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    cp: false,
    tv: 0,
    lv: 0,
    rv: 0,
    kv: 0,
    yv: 0,
    ytv: 0,
    yrv: 0,
  }
  return request(`/api/song/lyric/v1`, data, createOption(query))
}
