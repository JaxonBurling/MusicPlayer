import type { WyyQuery, WyyRequest } from '../util/types';

// 电台详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    time: query.time || '-1',
    id: query.id,
    limit: query.limit || '20',
    total: 'true',
  }
  return request(`/api/djradio/subscriber`, data, createOption(query, 'weapi'))
}
