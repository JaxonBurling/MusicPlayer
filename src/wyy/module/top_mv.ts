import type { WyyQuery, WyyRequest } from '../util/types';

// MV排行榜

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    area: query.area || '',
    limit: query.limit || 30,
    offset: query.offset || 0,
    total: true,
  }
  return request(`/api/mv/toplist`, data, createOption(query, 'weapi'))
}
