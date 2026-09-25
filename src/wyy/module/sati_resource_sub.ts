import type { WyyQuery, WyyRequest } from '../util/types';

// 助眠解压 - 收藏

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    cancel: query.cancel || false,
  }
  return request(`/api/voice/sati/resource/sub`, data, createOption(query))
}
