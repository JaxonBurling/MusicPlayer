import type { WyyQuery, WyyRequest } from '../util/types';

// 数字专辑销量

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    albumIds: query.ids,
  }
  return request(
    `/api/vipmall/albumproduct/album/query/sales`,
    data,
    createOption(query, 'weapi'),
  )
}
