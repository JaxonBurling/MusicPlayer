import type { WyyQuery, WyyRequest } from '../util/types';

// 一起听状态

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/listen/together/status/get`,
    {},
    createOption(query, 'weapi'),
  )
}
