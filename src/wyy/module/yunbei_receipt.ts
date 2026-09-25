import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 10,
    offset: query.offset || 0,
  }
  return request(`/api/point/receipt`, data, createOption(query))
}
