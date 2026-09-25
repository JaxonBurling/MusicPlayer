import type { WyyQuery, WyyRequest } from '../util/types';

// 助眠解压 - 查看同类推荐

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(
    `/api/voice/sati/resource/list/more/v1`,
    data,
    createOption(query),
  )
}
