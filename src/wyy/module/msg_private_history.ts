import type { WyyQuery, WyyRequest } from '../util/types';

// 私信内容

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    userId: query.uid,
    limit: query.limit || 30,
    time: query.before || 0,
    total: 'true',
  }
  return request(`/api/msg/private/history`, data, createOption(query, 'weapi'))
}
