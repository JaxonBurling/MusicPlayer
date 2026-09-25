import type { WyyQuery, WyyRequest } from '../util/types';

// 相关视频

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    type: /^\d+$/.test(query.id) ? 0 : 1,
  }
  return request(
    `/api/cloudvideo/v1/allvideo/rcmd`,
    data,
    createOption(query, 'weapi'),
  )
}
