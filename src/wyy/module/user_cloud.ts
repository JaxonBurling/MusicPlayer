import type { WyyQuery, WyyRequest } from '../util/types';

// 云盘数据

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 30,
    offset: query.offset || 0,
  }
  return request(`/api/v1/cloud/get`, data, createOption(query, 'weapi'))
}
