import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/usertool/task/todo/query`,
    data,
    createOption(query, 'weapi'),
  )
}
