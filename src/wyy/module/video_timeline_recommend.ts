import type { WyyQuery, WyyRequest } from '../util/types';

// 推荐视频

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    offset: query.offset || 0,
    filterLives: '[]',
    withProgramInfo: 'true',
    needUrl: '1',
    resolution: '480',
  }
  return request(`/api/videotimeline/get`, data, createOption(query, 'weapi'))
}
