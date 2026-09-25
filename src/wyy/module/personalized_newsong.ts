import type { WyyQuery, WyyRequest } from '../util/types';

// 推荐新歌

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    type: 'recommend',
    limit: query.limit || 10,
    areaId: query.areaId || 0,
  }
  return request(
    `/api/personalized/newsong`,
    data,
    createOption(query, 'weapi'),
  )
}
