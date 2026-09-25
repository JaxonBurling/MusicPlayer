import type { WyyQuery, WyyRequest } from '../util/types';

// TA关注的人(关注)

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    offset: query.offset || 0,
    limit: query.limit || 30,
    order: true,
  }
  return request(
    `/api/user/getfollows/${query.uid}`,
    data,
    createOption(query, 'weapi'),
  )
}
