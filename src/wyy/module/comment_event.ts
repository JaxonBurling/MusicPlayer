import type { WyyQuery, WyyRequest } from '../util/types';

// 获取动态评论

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 20,
    offset: query.offset || 0,
    beforeTime: query.before || 0,
  }
  return request(
    `/api/v1/resource/comments/${query.threadId}`,
    data,
    createOption(query, 'weapi'),
  )
}
