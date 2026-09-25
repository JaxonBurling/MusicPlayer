import type { WyyQuery, WyyRequest } from '../util/types';

// 歌手热门 50 首歌曲
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(`/api/artist/top/song`, data, createOption(query, 'weapi'))
}
