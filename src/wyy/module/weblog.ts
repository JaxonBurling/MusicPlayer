import type { WyyQuery, WyyRequest } from '../util/types';

// 操作记录

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/feedback/weblog`,
    query.data || {},
    createOption(query, 'weapi'),
  )
}
