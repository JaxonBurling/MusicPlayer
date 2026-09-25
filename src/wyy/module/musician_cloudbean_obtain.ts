import type { WyyQuery, WyyRequest } from '../util/types';

// 领取云豆

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    userMissionId: query.id,
    period: query.period,
  }
  return request(
    `/api/nmusician/workbench/mission/reward/obtain/new`,
    data,
    createOption(query, 'weapi'),
  )
}
