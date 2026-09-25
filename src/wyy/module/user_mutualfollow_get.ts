import type { WyyQuery, WyyRequest } from '../util/types';

// 用户是否互相关注

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    friendid: query.uid,
  }
  return request(`/api/user/mutualfollow/get`, data, createOption(query))
}
