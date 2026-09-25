import type { WyyQuery, WyyRequest } from '../util/types';

// 收藏计数

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/subcount`, {}, createOption(query, 'weapi'))
}
