import type { WyyQuery, WyyRequest } from '../util/types';

// 最近联系

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/msg/recentcontact/get`,
    data,
    createOption(query, 'weapi'),
  )
}
