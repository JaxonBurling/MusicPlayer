import type { WyyQuery, WyyRequest } from '../util/types';

// 用户状态
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/social/user/status`,
    {
      visitorId: query.uid,
    },
    createOption(query),
  )
}
