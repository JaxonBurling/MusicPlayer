import type { WyyQuery, WyyRequest } from '../util/types';

// 获取达人用户信息
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/user/creator/authinfo/get`, data, createOption(query))
}
