import type { WyyQuery, WyyRequest } from '../util/types';

// 本地歌曲匹配音乐信息

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  let songs = [
    {
      title: query.title || '',
      album: query.album || '',
      artist: query.artist || '',
      duration: query.duration || 0,
      persistId: query.md5,
    },
  ]
  const data = {
    songs: JSON.stringify(songs),
  }
  return request(`/api/search/match/new`, data, createOption(query))
}
