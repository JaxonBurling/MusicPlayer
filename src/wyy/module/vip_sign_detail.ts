import type { WyyQuery, WyyRequest } from '../util/types';

// 黑胶乐签打卡详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    signDayTime: query.timestamp,
    type: '1',
  }
  return request(
    `/api/vipnewcenter/app/level/user/checkin/history/detail`,
    data,
    createOption(query, 'eapi'),
  )
}
