import type { WyyQuery, WyyRequest } from '../util/types';

// 已购单曲

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 20,
    offset: query.offset || 0,
  }
  return request(
    `/api/single/mybought/song/list`,
    data,
    createOption(query, 'weapi'),
  )
}
