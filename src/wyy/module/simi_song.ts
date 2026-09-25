import type { WyyQuery, WyyRequest } from '../util/types';

// 相似歌曲

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songid: query.id,
    limit: query.limit || 50,
    offset: query.offset || 0,
  }
  return request(
    `/api/v1/discovery/simiSong`,
    data,
    createOption(query, 'weapi'),
  )
}
