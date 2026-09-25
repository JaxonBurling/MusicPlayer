import type { WyyQuery, WyyRequest } from '../util/types';

// 私信歌曲

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    msg: query.msg || '',
    type: 'song',
    userIds: '[' + query.user_ids + ']',
  }
  return request(`/api/msg/private/send`, data, createOption(query))
}
