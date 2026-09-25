import type { WyyQuery, WyyRequest } from '../util/types';

import __config from '../util/config.json';
const resourceTypeMap = __config.resourceTypeMap as Record<string, string>;
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.type = resourceTypeMap[query.type || 0]
  const threadId = query.type + query.sid
  const data = {
    targetUserId: query.uid,
    commentId: query.cid,
    cursor: query.cursor || '-1',
    threadId: threadId,
    pageNo: query.page || 1,
    idCursor: query.idCursor || -1,
    pageSize: query.pageSize || 100,
  }
  return request(
    `/api/v2/resource/comments/hug/list`,
    data,
    createOption(query),
  )
}
