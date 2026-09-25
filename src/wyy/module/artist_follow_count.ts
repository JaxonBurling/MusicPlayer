import type { WyyQuery, WyyRequest } from '../util/types';

// 歌手粉丝数量

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(
    `/api/artist/follow/count/get`,
    data,
    createOption(query, 'weapi'),
  )
}
