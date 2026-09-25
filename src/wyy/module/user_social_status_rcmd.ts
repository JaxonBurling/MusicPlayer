import type { WyyQuery, WyyRequest } from '../util/types';

// 用户状态 - 相同状态的用户
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/social/user/status/rcmd`, {}, createOption(query))
}
