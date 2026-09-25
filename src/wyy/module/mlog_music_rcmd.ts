import type { WyyQuery, WyyRequest } from '../util/types';

// 歌曲相关视频

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.mvid || 0,
    type: 2,
    rcmdType: 20,
    limit: query.limit || 10,
    extInfo: JSON.stringify({ songId: query.songid }),
  }
  return request(`/api/mlog/rcmd/feed/list`, data, createOption(query))
}
