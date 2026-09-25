import type { WyyQuery, WyyRequest } from '../util/types';

// 音乐人签到

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/creator/user/access`, data, createOption(query, 'weapi'))
}
