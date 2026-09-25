import type { WyyQuery, WyyRequest } from '../util/types';

// 乐谱列表
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    abTest: query.ab || 'b',
  }
  return request(`/api/music/sheet/list/v1`, data, createOption(query))
}
