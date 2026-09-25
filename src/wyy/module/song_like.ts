import type { WyyQuery, WyyRequest } from '../util/types';

// 喜欢歌曲

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const like = query.like !== 'false'
  const data = {
    trackId: query.id,
    userid: query.uid,
    like: like,
  }
  return request(`/api/song/like`, data, createOption(query))
}
