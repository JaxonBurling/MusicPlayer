import type { WyyQuery, WyyRequest } from '../util/types';

// 独家放送

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/personalized/privatecontent`,
    {},
    createOption(query, 'weapi'),
  )
}
