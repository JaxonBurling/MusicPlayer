import type { WyyQuery, WyyRequest } from '../util/types';

// 多级行政区划数据获取接口

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    bizCode: query.bizCode || '',
  }
  return request(`/api/lbs/city/code`, data, createOption(query))
}
