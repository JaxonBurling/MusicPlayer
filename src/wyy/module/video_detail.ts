import type { WyyQuery, WyyRequest } from '../util/types';

// 视频详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(
    `/api/cloudvideo/v1/video/detail`,
    data,
    createOption(query, 'weapi'),
  )
}
