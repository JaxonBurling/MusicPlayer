import type { WyyQuery, WyyRequest } from '../util/types';

// 收藏与取消收藏MV

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.t = query.t == 1 ? 'sub' : 'unsub'
  const data = {
    mvId: query.mvid,
    mvIds: '["' + query.mvid + '"]',
  }
  return request(`/api/mv/${query.t}`, data, createOption(query, 'weapi'))
}
