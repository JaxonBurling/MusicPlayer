import type { WyyQuery, WyyRequest } from '../util/types';

// 我的数字专辑

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 30,
    offset: query.offset || 0,
    total: true,
  }
  return request(
    `/api/digitalAlbum/purchased`,
    data,
    createOption(query, 'weapi'),
  )
}
