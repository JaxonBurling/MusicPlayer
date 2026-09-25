import type { WyyQuery, WyyRequest } from '../util/types';

// 歌手相关MV

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    artistId: query.id,
    limit: query.limit,
    offset: query.offset,
    total: true,
  }
  return request(`/api/artist/mvs`, data, createOption(query, 'weapi'))
}
