import type { WyyQuery, WyyRequest } from '../util/types';

// 私信

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    type: 'text',
    msg: query.msg,
    userIds: '[' + query.user_ids + ']',
  }
  return request(`/api/msg/private/send`, data, createOption(query))
}
