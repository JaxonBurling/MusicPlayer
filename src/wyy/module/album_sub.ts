import type { WyyQuery, WyyRequest } from '../util/types';

// 收藏/取消收藏专辑

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.t = query.t == 1 ? 'sub' : 'unsub'
  const data = {
    id: query.id,
  }
  return request(`/api/album/${query.t}`, data, createOption(query, 'weapi'))
}
