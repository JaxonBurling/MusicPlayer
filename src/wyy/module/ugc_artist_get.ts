import type { WyyQuery, WyyRequest } from '../util/types';

// 歌手简要百科信息
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    artistId: query.id,
  }
  return request(`/api/rep/ugc/artist/get`, data, createOption(query))
}
