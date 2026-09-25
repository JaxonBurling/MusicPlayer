import type { WyyQuery, WyyRequest } from '../util/types';

// 会员成长值

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/vipnewcenter/app/level/growhpoint/basic`,
    data,
    createOption(query, 'weapi'),
  )
}
