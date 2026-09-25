import type { WyyQuery, WyyRequest } from '../util/types';

// 视频标签列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/cloudvideo/group/list`,
    data,
    createOption(query, 'weapi'),
  )
}
