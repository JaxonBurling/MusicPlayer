import type { WyyQuery, WyyRequest } from '../util/types';

// 副歌时间
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/song/chorus`,
    {
      ids: JSON.stringify([query.id]),
    },
    createOption(query),
  )
}
