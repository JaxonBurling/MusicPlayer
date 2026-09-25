import type { WyyQuery, WyyRequest } from '../util/types';

// 歌词摘录 - 我的歌词本

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 10,
    offset: query.offset || 0,
  }
  return request(
    `/api/song/play/lyrics/mark/user/page`,
    data,
    createOption(query),
  )
}
