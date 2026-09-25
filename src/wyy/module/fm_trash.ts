import type { WyyQuery, WyyRequest } from '../util/types';

// 垃圾桶

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songId: query.id,
    alg: 'RT',
    time: query.time || 25,
  }
  return request(`/api/radio/trash/add`, data, createOption(query, 'weapi'))
}
