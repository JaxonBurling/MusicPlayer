import type { WyyQuery, WyyRequest } from '../util/types';

// 歌手相关视频

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    artistId: query.id,
    page: JSON.stringify({
      size: query.size || 10,
      cursor: query.cursor || 0,
    }),
    tab: 0,
    order: query.order || 0,
  }
  return request(`/api/mlog/artist/video`, data, createOption(query, 'weapi'))
}
