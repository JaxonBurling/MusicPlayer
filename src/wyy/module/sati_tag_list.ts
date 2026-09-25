import type { WyyQuery, WyyRequest } from '../util/types';

// 助眠解压 - 标签列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/voice/sati/tag/list`, data, createOption(query))
}
