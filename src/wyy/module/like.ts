import type { WyyQuery, WyyRequest } from '../util/types';

// 红心与取消红心歌曲

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  query.like = query.like == 'false' ? false : true
  const data = {
    alg: 'itembased',
    trackId: query.id,
    like: query.like,
    time: '3',
  }
  return request(`/api/radio/like`, data, createOption(query, 'weapi'))
}
