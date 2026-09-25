import type { WyyQuery, WyyRequest } from '../util/types';

// 获取音乐人任务

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/nmusician/workbench/special/right/vip/info`,
    data,
    createOption(query, 'eapi'),
  )
}
