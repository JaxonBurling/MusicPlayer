import type { WyyQuery, WyyRequest } from '../util/types';

// 助眠解压 - 特定时间场景下的推荐资源

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    firstQuery: false,
  }
  return request(
    `/api/voice/sati/timescene/resources/get`,
    data,
    createOption(query),
  )
}
