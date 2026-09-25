import type { WyyQuery, WyyRequest } from '../util/types';

// MV链接

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    r: query.r || 1080,
  }
  return request(
    `/api/song/enhance/play/mv/url`,
    data,
    createOption(query, 'weapi'),
  )
}
