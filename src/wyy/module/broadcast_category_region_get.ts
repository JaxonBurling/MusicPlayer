import type { WyyQuery, WyyRequest } from '../util/types';

// 广播电台 - 分类/地区信息

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/voice/broadcast/category/region/get`,
    data,
    createOption(query),
  )
}
