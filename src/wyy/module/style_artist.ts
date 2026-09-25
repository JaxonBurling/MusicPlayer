import type { WyyQuery, WyyRequest } from '../util/types';

// 曲风-歌手

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    cursor: query.cursor || 0,
    size: query.size || 20,
    tagId: query.tagId,
    sort: 0,
  }
  return request(
    `/api/style-tag/home/artist`,
    data,
    createOption(query, 'weapi'),
  )
}
