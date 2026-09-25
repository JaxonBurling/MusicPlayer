import type { WyyQuery, WyyRequest } from '../util/types';

// 广播电台 - 收藏/取消收藏电台

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.t = query.t == 1 ? 'false' : 'true'
  const data = {
    contentType: 'BROADCAST',
    contentId: query.id,
    cancelCollect: query.t,
  }
  return request(`/api/content/interact/collect`, data, createOption(query))
}
