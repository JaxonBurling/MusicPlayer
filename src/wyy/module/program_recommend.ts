import type { WyyQuery, WyyRequest } from '../util/types';

// 推荐节目

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    cateId: query.type,
    limit: query.limit || 10,
    offset: query.offset || 0,
  }
  return request(
    `/api/program/recommend/v1`,
    data,
    createOption(query, 'weapi'),
  )
}
