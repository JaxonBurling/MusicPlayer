import type { WyyQuery, WyyRequest } from '../util/types';

// 精选电台

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/djradio/recommend/v1`, {}, createOption(query, 'weapi'))
}
