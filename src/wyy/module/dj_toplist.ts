import type { WyyQuery, WyyRequest } from '../util/types';

// 新晋电台榜/热门电台榜
const typeMap: Record<string, number> = {
  new: 0,
  hot: 1,
}
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 100,
    offset: query.offset || 0,
    type: typeMap[query.type || 'new'] || '0', //0为新晋,1为热门
  }
  return request(`/api/djradio/toplist`, data, createOption(query, 'weapi'))
}
