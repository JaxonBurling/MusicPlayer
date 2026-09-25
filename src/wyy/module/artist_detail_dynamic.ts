import type { WyyQuery, WyyRequest } from '../util/types';

// 歌手动态信息

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(`/api/artist/detail/dynamic`, data, createOption(query))
}
