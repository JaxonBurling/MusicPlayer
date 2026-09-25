import type { WyyQuery, WyyRequest } from '../util/types';

// 电台详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.rid,
  }
  return request(`/api/djradio/v2/get`, data, createOption(query, 'weapi'))
}
