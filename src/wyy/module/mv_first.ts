import type { WyyQuery, WyyRequest } from '../util/types';

// 最新MV

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    // 'offset': query.offset || 0,
    area: query.area || '',
    limit: query.limit || 30,
    total: true,
  }
  return request(`/api/mv/first`, data, createOption(query))
}
