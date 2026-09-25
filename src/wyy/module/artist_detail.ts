import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/artist/head/info/get`,
    {
      id: query.id,
    },
    createOption(query),
  )
}
