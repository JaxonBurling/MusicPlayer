import type { WyyQuery, WyyRequest } from '../util/types';

// 举报评论

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    threadId: 'R_SO_4_' + query.id,
    commentId: query.cid,
    reason: query.reason,
  }
  return request(`/api/report/reportcomment`, data, createOption(query))
}
