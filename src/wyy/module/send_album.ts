import type { WyyQuery, WyyRequest } from '../util/types';

// 私信专辑

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    msg: query.msg || '',
    type: 'album',
    userIds: '[' + query.user_ids + ']',
  }
  return request(`/api/msg/private/send`, data, createOption(query))
}
