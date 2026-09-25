import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    startTime: query.startTime || Date.now(),
    endTime: query.endTime || Date.now(),
  }
  return request(`/api/mcalendar/detail`, data, createOption(query, 'weapi'))
}
