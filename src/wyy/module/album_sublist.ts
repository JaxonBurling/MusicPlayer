import type { WyyQuery, WyyRequest } from '../util/types';

// 已收藏专辑列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 25,
    offset: query.offset || 0,
    total: true,
  }
  return request(`/api/album/sublist`, data, createOption(query, 'weapi'))
}
