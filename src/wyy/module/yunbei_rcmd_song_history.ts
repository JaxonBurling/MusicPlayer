import type { WyyQuery, WyyRequest } from '../util/types';

// 云贝推歌历史记录

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    page: JSON.stringify({
      size: query.size || 20,
      cursor: query.cursor || '',
    }),
  }
  return request(
    `/api/yunbei/rcmd/song/history/list`,
    data,
    createOption(query, 'weapi'),
  )
}
