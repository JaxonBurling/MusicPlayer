import type { WyyQuery, WyyRequest } from '../util/types';

// 音乐人数据概况

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/creator/musician/statistic/data/overview/get`,
    data,
    createOption(query, 'weapi'),
  )
}
