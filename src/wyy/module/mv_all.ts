import type { WyyQuery, WyyRequest } from '../util/types';

// 全部MV

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    tags: JSON.stringify({
      地区: query.area || '全部',
      类型: query.type || '全部',
      排序: query.order || '上升最快',
    }),
    offset: query.offset || 0,
    total: 'true',
    limit: query.limit || 30,
  }
  return request(`/api/mv/all`, data, createOption(query))
}
