import type { WyyQuery, WyyRequest } from '../util/types';

// 电台节目详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(`/api/dj/program/detail`, data, createOption(query, 'weapi'))
}
