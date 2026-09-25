import type { WyyQuery, WyyRequest } from '../util/types';

// 首页轮播图
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const typeMap: Record<number, string> = {
    0: 'pc',
    1: 'android',
    2: 'iphone',
    3: 'ipad',
  }
  const type = typeMap[query.type || 0] || 'pc'
  return request(
    `/api/v2/banner/get`,
    { clientType: type },
    createOption(query),
  )
}
