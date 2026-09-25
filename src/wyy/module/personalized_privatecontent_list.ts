import type { WyyQuery, WyyRequest } from '../util/types';

// 独家放送列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    offset: query.offset || 0,
    total: 'true',
    limit: query.limit || 60,
  }
  return request(
    `/api/v2/privatecontent/list`,
    data,
    createOption(query, 'weapi'),
  )
}
