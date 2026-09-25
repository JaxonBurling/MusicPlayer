import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/playlist/video/recent`,
    data,
    createOption(query, 'weapi'),
  )
}
