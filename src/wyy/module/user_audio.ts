import type { WyyQuery, WyyRequest } from '../util/types';

// 用户创建的电台

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    userId: query.uid,
  }
  return request(`/api/djradio/get/byuser`, data, createOption(query, 'weapi'))
}
