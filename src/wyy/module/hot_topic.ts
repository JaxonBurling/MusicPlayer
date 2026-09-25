import type { WyyQuery, WyyRequest } from '../util/types';

//热门话题

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 20,
    offset: query.offset || 0,
  }
  return request(`/api/act/hot`, data, createOption(query, 'weapi'))
}
