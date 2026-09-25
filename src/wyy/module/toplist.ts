import type { WyyQuery, WyyRequest } from '../util/types';

// 所有榜单介绍

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/toplist`, {}, createOption(query))
}
