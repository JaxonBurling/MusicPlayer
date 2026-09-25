import type { WyyQuery, WyyRequest } from '../util/types';

// 乐谱预览
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(`/api/music/sheet/preview/info`, data, createOption(query))
}
