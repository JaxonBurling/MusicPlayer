import type { WyyQuery, WyyRequest } from '../util/types';

// 热搜列表
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/hotsearchlist/get`, data, createOption(query, 'weapi'))
}
