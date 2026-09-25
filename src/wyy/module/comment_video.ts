import type { WyyQuery, WyyRequest } from '../util/types';

// 视频评论

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    rid: query.id,
    limit: query.limit || 20,
    offset: query.offset || 0,
    beforeTime: query.before || 0,
  }
  return request(
    `/api/v1/resource/comments/R_VI_62_${query.id}`,
    data,
    createOption(query, 'weapi'),
  )
}
