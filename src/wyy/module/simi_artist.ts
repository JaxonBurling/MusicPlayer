import type { WyyQuery, WyyRequest } from '../util/types';

// 相似歌手
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    artistid: query.id,
  }
  return request(
    `/api/discovery/simiArtist`,
    data,
    createOption(query, 'weapi'),
  )
}
