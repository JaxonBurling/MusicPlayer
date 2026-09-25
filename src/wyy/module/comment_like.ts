import type { WyyQuery, WyyRequest } from '../util/types';

import __config from '../util/config.json';
const resourceTypeMap = __config.resourceTypeMap as Record<string, string>;
// 点赞与取消点赞评论

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.t = query.t == 1 ? 'like' : 'unlike'
  query.type = resourceTypeMap[query.type]
  const data = {
    threadId: query.type + query.id,
    commentId: query.cid,
  }
  if (query.type == 'A_EV_2_') {
    data.threadId = query.threadId
  }
  return request(
    `/api/v1/comment/${query.t}`,
    data,
    createOption(query, 'weapi'),
  )
}
