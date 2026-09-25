import type { WyyQuery, WyyRequest } from '../util/types';

// 已收藏MV列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 25,
    offset: query.offset || 0,
    total: true,
  }
  return request(
    `/api/cloudvideo/allvideo/sublist`,
    data,
    createOption(query, 'weapi'),
  )
}
