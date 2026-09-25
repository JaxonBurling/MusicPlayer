import type { WyyQuery, WyyRequest } from '../util/types';

// 专辑简要百科信息
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    albumId: query.id,
  }
  return request(`/api/rep/ugc/album/get`, data, createOption(query))
}
