import type { WyyQuery, WyyRequest } from '../util/types';

// 通知

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 30,
    time: query.lasttime || -1,
  }
  return request(`/api/msg/notices`, data, createOption(query, 'weapi'))
}
