import type { WyyQuery, WyyRequest } from '../util/types';

// 推荐电台

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/personalized/djprogram`,
    {},
    createOption(query, 'weapi'),
  )
}
