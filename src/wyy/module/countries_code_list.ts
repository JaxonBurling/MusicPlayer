import type { WyyQuery, WyyRequest } from '../util/types';

// 国家编码列表
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/lbs/countries/v1`, data, createOption(query))
}
