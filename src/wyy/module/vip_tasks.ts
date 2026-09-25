import type { WyyQuery, WyyRequest } from '../util/types';

// 会员任务

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/vipnewcenter/app/level/task/list`,
    data,
    createOption(query, 'weapi'),
  )
}
