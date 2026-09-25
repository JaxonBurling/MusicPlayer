import type { WyyQuery, WyyRequest } from '../util/types';

// 公开隐私歌单

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    privacy: 0,
  }
  return request(`/api/playlist/update/privacy`, data, createOption(query))
}
