import type { WyyQuery, WyyRequest } from '../util/types';

// 歌手粉丝

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    limit: query.limit || 20,
    offset: query.offset || 0,
  }
  return request(`/api/artist/fans/get`, data, createOption(query, 'weapi'))
}
