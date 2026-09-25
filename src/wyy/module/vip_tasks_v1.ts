import type { WyyQuery, WyyRequest } from '../util/types';

// 会员任务 - 新版

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    taskType: 'app_vip_task_center',
    userId: query.id,
  }
  return request(
    `/api/middle/vip/mission/user/progress/list`,
    data,
    createOption(query, 'xeapi'),
  )
}
