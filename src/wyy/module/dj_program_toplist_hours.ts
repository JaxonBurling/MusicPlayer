import type { WyyQuery, WyyRequest } from '../util/types';

// 电台24小时节目榜
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 100,
    // 不支持 offset
  }
  return request(
    `/api/djprogram/toplist/hours`,
    data,
    createOption(query, 'weapi'),
  )
}
