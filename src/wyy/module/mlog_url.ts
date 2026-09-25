import type { WyyQuery, WyyRequest } from '../util/types';

// mlog链接

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    resolution: query.res || 1080,
    type: 1,
  }
  return request(`/api/mlog/detail/v1`, data, createOption(query, 'weapi'))
}
