import type { WyyQuery, WyyRequest } from '../util/types';

// 用户电台节目

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 30,
    offset: query.offset || 0,
  }
  return request(
    `/api/dj/program/${query.uid}`,
    data,
    createOption(query, 'weapi'),
  )
}
