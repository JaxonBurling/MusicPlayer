import type { WyyQuery, WyyRequest } from '../util/types';

// 视频分类列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    offset: query.offset || 0,
    total: 'true',
    limit: query.limit || 99,
  }
  return request(
    `/api/cloudvideo/category/list`,
    data,
    createOption(query, 'weapi'),
  )
}
