import type { WyyQuery, WyyRequest } from '../util/types';

// 电台今日优选

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    page: query.page || 0,
  }
  return request(
    `/api/djradio/home/today/perfered`,
    data,
    createOption(query, 'weapi'),
  )
}
