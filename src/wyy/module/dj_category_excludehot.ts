import type { WyyQuery, WyyRequest } from '../util/types';

// 电台非热门类型

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/djradio/category/excludehot`,
    {},
    createOption(query, 'weapi'),
  )
}
