import type { WyyQuery, WyyRequest } from '../util/types';

// @我

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    offset: query.offset || 0,
    limit: query.limit || 30,
    total: 'true',
  }
  return request(`/api/forwards/get`, data, createOption(query, 'weapi'))
}
