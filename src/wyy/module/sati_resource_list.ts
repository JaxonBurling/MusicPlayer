import type { WyyQuery, WyyRequest } from '../util/types';

// 助眠解压 - 获取标签下资源列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    tag: query.tag,
    firstQuery: false,
  }

  return request(`/api/voice/sati/resource/list`, data, createOption(query))
}
