import type { WyyQuery, WyyRequest } from '../util/types';

// 退出登录

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/logout`, {}, createOption(query))
}
