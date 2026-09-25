import type { WyyQuery, WyyRequest } from '../util/types';

// 全部视频列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    groupId: 0,
    offset: query.offset || 0,
    need_preview_url: 'true',
    total: true,
  }
  //   /api/videotimeline/otherclient/get
  return request(
    `/api/videotimeline/otherclient/get`,
    data,
    createOption(query, 'weapi'),
  )
}
