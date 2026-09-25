import type { WyyQuery, WyyRequest } from '../util/types';

// 喜欢的歌曲(无序)

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    uid: query.uid,
  }
  return request(`/api/song/like/get`, data, createOption(query))
}
