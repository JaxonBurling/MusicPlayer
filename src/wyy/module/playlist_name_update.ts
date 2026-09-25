import type { WyyQuery, WyyRequest } from '../util/types';

// 更新歌单名

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    name: query.name,
  }
  return request(`/api/playlist/update/name`, data, createOption(query))
}
