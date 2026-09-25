import type { WyyQuery, WyyRequest } from '../util/types';

// 一键领取所有会员成长值

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/vipnewcenter/app/level/task/reward/getall`,
    data,
    createOption(query, 'xeapi'),
  )
}
