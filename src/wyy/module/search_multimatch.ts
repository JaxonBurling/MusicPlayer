import type { WyyQuery, WyyRequest } from '../util/types';

// 多类型搜索

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    type: query.type || 1,
    s: query.keywords || '',
  }
  return request(
    `/api/search/suggest/multimatch`,
    data,
    createOption(query, 'weapi'),
  )
}
