import type { WyyQuery, WyyRequest } from '../util/types';

import __config from '../util/config.json';
const resourceTypeMap = __config.resourceTypeMap as Record<string, string>;
// 热门评论

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.type = resourceTypeMap[query.type]
  const data = {
    rid: query.id,
    limit: query.limit || 20,
    offset: query.offset || 0,
    beforeTime: query.before || 0,
  }
  return request(
    `/api/v1/resource/hotcomments/${query.type}${query.id}`,
    data,
    createOption(query, 'weapi'),
  )
}
