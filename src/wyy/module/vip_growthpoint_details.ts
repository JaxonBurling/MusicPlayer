import type { WyyQuery, WyyRequest } from '../util/types';

// 会员成长值领取记录

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 20,
    offset: query.offset || 0,
  }
  return request(
    `/api/vipnewcenter/app/level/growth/details`,
    data,
    createOption(query, 'weapi'),
  )
}
