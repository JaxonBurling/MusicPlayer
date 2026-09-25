import type { WyyQuery, WyyRequest } from '../util/types';

// 评论

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    beforeTime: query.before || '-1',
    limit: query.limit || 30,
    total: 'true',
    uid: query.uid,
  }

  return request(
    `/api/v1/user/comments/${query.uid}`,
    data,
    createOption(query, 'weapi'),
  )
}
