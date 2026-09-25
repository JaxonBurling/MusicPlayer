import type { WyyQuery, WyyRequest } from '../util/types';

// MV 点赞转发评论数数据

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    threadid: `R_MV_5_${query.mvid}`,
    composeliked: true,
  }
  return request(
    `/api/comment/commentthread/info`,
    data,
    createOption(query, 'weapi'),
  )
}
