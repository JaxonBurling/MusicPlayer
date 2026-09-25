import type { WyyQuery, WyyRequest } from '../util/types';

// 曲风列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/tag/list/get`, data, createOption(query, 'weapi'))
}
