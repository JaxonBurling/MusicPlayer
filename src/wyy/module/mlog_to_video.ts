import type { WyyQuery, WyyRequest } from '../util/types';

// 将mlog id转为video id

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    mlogId: query.id,
  }
  return request(
    `/api/mlog/video/convert/id`,
    data,
    createOption(query, 'weapi'),
  )
}
