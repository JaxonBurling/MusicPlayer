import type { WyyQuery, WyyRequest } from '../util/types';

// 点赞与取消点赞资源
import __config from '../util/config.json';
const resourceTypeMap = __config.resourceTypeMap as Record<string, string>;
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.t = query.t == 1 ? 'like' : 'unlike'
  query.type = resourceTypeMap[query.type]
  const data = {
    threadId: query.type + query.id,
  }
  if (query.type === 'A_EV_2_') {
    data.threadId = query.threadId
  }
  return request(`/api/resource/${query.t}`, data, createOption(query, 'weapi'))
}
