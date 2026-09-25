import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  // /api/point/today/get
  return request(`/api/point/signed/get`, data, createOption(query, 'weapi'))
}
