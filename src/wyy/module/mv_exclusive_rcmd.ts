import type { WyyQuery, WyyRequest } from '../util/types';

// 网易出品

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    offset: query.offset || 0,
    limit: query.limit || 30,
  }
  return request(`/api/mv/exclusive/rcmd`, data, createOption(query))
}
