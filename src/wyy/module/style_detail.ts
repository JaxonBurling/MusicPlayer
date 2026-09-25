import type { WyyQuery, WyyRequest } from '../util/types';

// 曲风详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    tagId: query.tagId,
  }
  return request(`/api/style-tag/home/head`, data, createOption(query, 'weapi'))
}
