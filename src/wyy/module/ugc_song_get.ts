import type { WyyQuery, WyyRequest } from '../util/types';

// 歌曲简要百科信息
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songId: query.id,
  }
  return request(`/api/rep/ugc/song/get`, data, createOption(query))
}
