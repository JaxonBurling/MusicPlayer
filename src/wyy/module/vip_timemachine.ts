import type { WyyQuery, WyyRequest } from '../util/types';

// 黑胶时光机

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data: Record<string, any> = {}
  if (query.startTime && query.endTime) {
    data.startTime = query.startTime
    data.endTime = query.endTime
    data.type = 1
    data.limit = query.limit || 60
  }
  return request(
    `/api/vipmusic/newrecord/weekflow`,
    data,
    createOption(query, 'weapi'),
  )
}
