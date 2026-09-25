import type { WyyQuery, WyyRequest } from '../util/types';

// 删除歌单

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    ids: '[' + query.id + ']',
  }
  return request(`/api/playlist/remove`, data, createOption(query, 'weapi'))
}
