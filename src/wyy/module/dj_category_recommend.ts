import type { WyyQuery, WyyRequest } from '../util/types';

// 电台推荐类型

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/djradio/home/category/recommend`,
    {},
    createOption(query, 'weapi'),
  )
}
