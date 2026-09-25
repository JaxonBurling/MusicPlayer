import type { WyyQuery, WyyRequest } from '../util/types';

// 默认搜索关键词

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/search/defaultkeyword/get`, {}, createOption(query))
}
