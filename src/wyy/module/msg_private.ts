import type { WyyQuery, WyyRequest } from '../util/types';

// 私信

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    offset: query.offset || 0,
    limit: query.limit || 30,
    total: 'true',
  }
  return request(`/api/msg/private/users`, data, createOption(query, 'weapi'))
}
