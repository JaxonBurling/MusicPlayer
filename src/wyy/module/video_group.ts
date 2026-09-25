import type { WyyQuery, WyyRequest } from '../util/types';

// 视频标签/分类下的视频

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    groupId: query.id,
    offset: query.offset || 0,
    need_preview_url: 'true',
    total: true,
  }
  return request(
    `/api/videotimeline/videogroup/otherclient/get`,
    data,
    createOption(query, 'weapi'),
  )
}
