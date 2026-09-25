import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/v1/user/bindings/${query.uid}`,
    data,
    createOption(query, 'weapi'),
  )
}
