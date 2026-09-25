import type { WyyQuery, WyyRequest } from '../util/types';

// 关注TA的人(粉丝)

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    userId: query.uid,
    time: '0',
    limit: query.limit || 20,
    offset: query.offset || 0,
    getcounts: 'true',
  }
  return request(
    `/api/user/getfolloweds/${query.uid}`,
    data,
    createOption(query),
  )
}
