import type { WyyQuery, WyyRequest } from '../util/types';

// 所有榜单内容摘要v2

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/toplist/detail/v2`, {}, createOption(query, 'weapi'))
}
