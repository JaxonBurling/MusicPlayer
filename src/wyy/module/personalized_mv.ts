import type { WyyQuery, WyyRequest } from '../util/types';

// 推荐MV

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/personalized/mv`, {}, createOption(query, 'weapi'))
}
