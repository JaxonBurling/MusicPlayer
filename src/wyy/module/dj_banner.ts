import type { WyyQuery, WyyRequest } from '../util/types';

// 电台banner

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/djradio/banner/get`, {}, createOption(query, 'weapi'))
}
