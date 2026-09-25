import type { WyyQuery, WyyRequest } from '../util/types';

// 关注与取消关注用户

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.t = query.t == 1 ? 'follow' : 'delfollow'
  return request(
    `/api/user/${query.t}/${query.id}`,
    {},
    createOption(query, 'weapi'),
  )
}
