import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/usertool/task/list/all`,
    data,
    createOption(query, 'weapi'),
  )
}
