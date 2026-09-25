import type { WyyQuery, WyyRequest } from '../util/types';

// 已购买单曲

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || '20',
    offset: query.offset || '0',
    total: 'true',
  }
  return request(`/api/member/song/singledownlist`, data, createOption(query))
}
