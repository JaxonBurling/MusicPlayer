import type { WyyQuery, WyyRequest } from '../util/types';

// MV详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.mvid,
  }
  return request(`/api/v1/mv/detail`, data, createOption(query, 'weapi'))
}
