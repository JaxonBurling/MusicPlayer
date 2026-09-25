import type { WyyQuery, WyyRequest } from '../util/types';

// 视频链接

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    ids: '["' + query.id + '"]',
    resolution: query.res || 1080,
  }
  return request(`/api/cloudvideo/playurl`, data, createOption(query, 'weapi'))
}
