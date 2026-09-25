import type { WyyQuery, WyyRequest } from '../util/types';

// 更新歌曲顺序

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    pid: query.pid,
    trackIds: query.ids,
    op: 'update',
  }

  return request(`/api/playlist/manipulate/tracks`, data, createOption(query))
}
