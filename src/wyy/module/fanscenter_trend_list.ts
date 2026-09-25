import type { WyyQuery, WyyRequest } from '../util/types';

// 粉丝来源
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    startTime: query.startTime || Date.now() - 7 * 24 * 3600 * 1000,
    endTime: query.endTime || Date.now(),
    type: query.type || 0, //新增关注:0 新增取关:1
  }
  return request(`/api/fanscenter/trend/list`, data, createOption(query))
}
