import type { WyyQuery, WyyRequest } from '../util/types';

import __config from '../util/config.json';
const resourceTypeMap = __config.resourceTypeMap as Record<string, string>;
// 发送与删除评论

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const tMap: Record<number, string> = {
    1: 'add',
    0: 'delete',
    2: 'reply',
  }
  query.t = tMap[query.t]
  query.type = resourceTypeMap[query.type]
  const data: Record<string, any> = {
    threadId: query.type + query.id,
  }

  if (query.type == 'A_EV_2_') {
    data.threadId = query.threadId
  }
  if (query.t == 'add') data.content = query.content
  else if (query.t == 'delete') data.commentId = query.commentId
  else if (query.t == 'reply') {
    data.commentId = query.commentId
    data.content = query.content
  }
  return request(
    `/api/resource/comments/${query.t}`,
    data,
    createOption(query, 'weapi'),
  )
}
