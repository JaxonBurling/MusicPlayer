import type { WyyQuery, WyyRequest } from '../util/types';

// 视频点赞转发评论数数据

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    threadid: `R_VI_62_${query.vid}`,
    composeliked: true,
  }
  return request(
    `/api/comment/commentthread/info`,
    data,
    createOption(query, 'weapi'),
  )
}
