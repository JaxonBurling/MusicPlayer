import type { WyyQuery, WyyRequest } from '../util/types';

// DIFM电台 - 取消收藏频道

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(`/api/dj/difm/channel/unsubscribe`, data, createOption(query))
}
