import type { WyyQuery, WyyRequest } from '../util/types';

// 黑胶乐签未来签到信息

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/vipnewcenter/app/user/sign/info`,
    data,
    createOption(query, 'weapi'),
  )
}
