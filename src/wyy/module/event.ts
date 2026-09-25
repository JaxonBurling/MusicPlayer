import type { WyyQuery, WyyRequest } from '../util/types';

// 获取动态列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    pagesize: query.pagesize || 20,
    lasttime: query.lasttime || -1,
  }
  return request(`/api/v1/event/get`, data, createOption(query, 'weapi'))
}
