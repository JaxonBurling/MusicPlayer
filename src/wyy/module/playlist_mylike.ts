import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    time: query.time || '-1',
    limit: query.limit || '12',
  }
  return request(
    `/api/mlog/playlist/mylike/bytime/get`,
    data,
    createOption(query, 'weapi'),
  )
}
