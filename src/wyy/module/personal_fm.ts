import type { WyyQuery, WyyRequest } from '../util/types';

// 私人FM

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/v1/radio/get`, {}, createOption(query, 'weapi'))
}
