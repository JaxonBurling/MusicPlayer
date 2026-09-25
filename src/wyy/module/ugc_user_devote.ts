import type { WyyQuery, WyyRequest } from '../util/types';

// 用户贡献条目、积分、云贝数量
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/rep/ugc/user/devote`, data, createOption(query))
}
