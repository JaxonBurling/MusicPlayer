import type { WyyQuery, WyyRequest } from '../util/types';

// 搜索建议

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    s: query.keywords || '',
  }
  let type = query.type == 'mobile' ? 'keyword' : 'web'
  return request(
    `/api/search/suggest/` + type,
    data,
    createOption(query, 'weapi'),
  )
}
