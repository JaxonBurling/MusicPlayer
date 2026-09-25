import type { WyyQuery, WyyRequest } from '../util/types';

// 电台个性推荐

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/djradio/personalize/rcmd`,
    {
      limit: query.limit || 6,
    },
    createOption(query, 'weapi'),
  )
}
