import type { WyyQuery, WyyRequest } from '../util/types';

// 精品歌单 tags
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/playlist/highquality/tags`,
    data,
    createOption(query, 'weapi'),
  )
}
