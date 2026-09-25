import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 100,
  }
  return request(
    `/api/play-record/album/list`,
    data,
    createOption(query, 'weapi'),
  )
}
