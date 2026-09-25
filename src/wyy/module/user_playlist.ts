import type { WyyQuery, WyyRequest } from '../util/types';

// 用户歌单

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    uid: query.uid,
    limit: query.limit || 30,
    offset: query.offset || 0,
    includeVideo: true,
  }
  return request(`/api/user/playlist`, data, createOption(query, 'weapi'))
}
