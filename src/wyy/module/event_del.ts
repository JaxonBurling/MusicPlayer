import type { WyyQuery, WyyRequest } from '../util/types';

// 删除动态

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.evId,
  }
  return request(`/api/event/delete`, data, createOption(query, 'weapi'))
}
