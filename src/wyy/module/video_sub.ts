import type { WyyQuery, WyyRequest } from '../util/types';

// 收藏与取消收藏视频

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.t = query.t == 1 ? 'sub' : 'unsub'
  const data = {
    id: query.id,
  }
  return request(
    `/api/cloudvideo/video/${query.t}`,
    data,
    createOption(query, 'weapi'),
  )
}
