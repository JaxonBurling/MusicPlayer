import type { WyyQuery, WyyRequest } from '../util/types';

// 领取会员成长值

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    taskIds: query.ids,
  }
  return request(
    `/api/vipnewcenter/app/level/task/reward/get`,
    data,
    createOption(query, 'weapi'),
  )
}
