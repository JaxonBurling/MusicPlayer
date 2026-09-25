import type { WyyQuery, WyyRequest } from '../util/types';

// 编辑歌单顺序

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    ids: query.ids,
  }
  return request(
    `/api/playlist/order/update`,
    data,
    createOption(query, 'weapi'),
  )
}
