import type { WyyQuery, WyyRequest } from '../util/types';

// 用户动态

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    getcounts: true,
    time: query.lasttime || -1,
    limit: query.limit || 30,
    total: false,
  }
  return request(`/api/event/get/${query.uid}`, data, createOption(query))
}
