import type { WyyQuery, WyyRequest } from '../util/types';

// 订阅与取消电台

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.t = query.t == 1 ? 'sub' : 'unsub'
  const data = {
    id: query.rid,
  }
  return request(`/api/djradio/${query.t}`, data, createOption(query, 'weapi'))
}
