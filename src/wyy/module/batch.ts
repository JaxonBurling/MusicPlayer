import type { WyyQuery, WyyRequest } from '../util/types';

// 批量请求接口

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data: Record<string, any> = {}
  Object.keys(query).forEach((i: any) => {
    if (/^\/api\//.test(i)) {
      data[i] = query[i]
    }
  })
  return request(`/api/batch`, data, createOption(query))
}
