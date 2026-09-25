import type { WyyQuery, WyyRequest } from '../util/types';

// 获取专辑歌曲的音质

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(`/api/album/privilege`, data, createOption(query))
}
