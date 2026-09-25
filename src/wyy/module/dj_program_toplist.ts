import type { WyyQuery, WyyRequest } from '../util/types';

// 电台节目榜

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 100,
    offset: query.offset || 0,
  }
  return request(`/api/program/toplist/v1`, data, createOption(query, 'weapi'))
}
