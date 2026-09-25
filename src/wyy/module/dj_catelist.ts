import type { WyyQuery, WyyRequest } from '../util/types';

// 电台分类列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/djradio/category/get`, {}, createOption(query, 'weapi'))
}
