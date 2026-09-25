import type { WyyQuery, WyyRequest } from '../util/types';

// 用户徽章
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/medal/user/page`,
    {
      uid: query.uid,
    },
    createOption(query),
  )
}
