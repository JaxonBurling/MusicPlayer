import type { WyyQuery, WyyRequest } from '../util/types';

// 更新歌单标签

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    tags: query.tags,
  }
  return request(`/api/playlist/tags/update`, data, createOption(query))
}
