import type { WyyQuery, WyyRequest } from '../util/types';

// 私信和通知接口

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/pl/count`, data, createOption(query, 'weapi'))
}
