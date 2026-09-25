import type { WyyQuery, WyyRequest } from '../util/types';

// 收藏与取消收藏歌手

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.t = query.t == 1 ? 'sub' : 'unsub'
  const data = {
    artistId: query.id,
    artistIds: '[' + query.id + ']',
  }
  return request(`/api/artist/${query.t}`, data, createOption(query, 'weapi'))
}
