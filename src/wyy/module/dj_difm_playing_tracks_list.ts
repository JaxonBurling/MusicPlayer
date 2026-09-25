import type { WyyQuery, WyyRequest } from '../util/types';

// DIFM电台 - 播放列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 5,
    source: query.source || 0,
    channelId: query.channelId,
  }
  return request(`/api/dj/difm/playing/tracks/list`, data, createOption(query))
}
