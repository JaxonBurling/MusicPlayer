import type { WyyQuery, WyyRequest } from '../util/types';

// 私信歌单

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.playlist,
    type: 'playlist',
    msg: query.msg,
    userIds: '[' + query.user_ids + ']',
  }
  return request(`/api/msg/private/send`, data, createOption(query))
}
