import type { WyyQuery, WyyRequest } from '../util/types';

// 歌单分类列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    cat: query.cat || '全部',
    limit: query.limit || 24,
    newStyle: true,
  }
  return request(`/api/playlist/category/list`, data, createOption(query))
}
