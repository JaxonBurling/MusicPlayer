import type { WyyQuery, WyyRequest } from '../util/types';

// 付费精品
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 100,
    // 不支持 offset
  }
  return request(`/api/djradio/toplist/pay`, data, createOption(query, 'weapi'))
}
