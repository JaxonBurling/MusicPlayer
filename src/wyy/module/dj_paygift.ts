import type { WyyQuery, WyyRequest } from '../util/types';

// 付费电台

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 30,
    offset: query.offset || 0,
    _nmclfl: 1,
  }
  return request(
    `/api/djradio/home/paygift/list`,
    data,
    createOption(query, 'weapi'),
  )
}
