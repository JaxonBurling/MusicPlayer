import type { WyyQuery, WyyRequest } from '../util/types';

// 签到进度

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    moduleId: query.moduleId || '1207signin-1207signin',
  }
  return request(
    `/api/act/modules/signin/v2/progress`,
    data,
    createOption(query, 'weapi'),
  )
}
