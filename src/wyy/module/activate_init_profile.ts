import type { WyyQuery, WyyRequest } from '../util/types';

// 初始化名字

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    nickname: query.nickname,
  }
  return request(`/api/activate/initProfile`, data, createOption(query))
}
