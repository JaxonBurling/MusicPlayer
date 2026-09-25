import type { WyyQuery, WyyRequest } from '../util/types';

// 粉丝数量
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/fanscenter/overview/get`, data, createOption(query))
}
