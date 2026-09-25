import type { WyyQuery, WyyRequest } from '../util/types';

// 搜索建议pc端

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    keyword: query.keyword || '',
  }
  return request(
    `/api/search/pc/suggest/keyword/get`,
    data,
    createOption(query),
  )
}
