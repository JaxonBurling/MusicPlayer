import type { WyyQuery, WyyRequest } from '../util/types';

// 广播电台 - 全部电台

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    categoryId: query.categoryId || '0',
    regionId: query.regionId || '0',
    limit: query.limit || '20',
    lastId: query.lastId || '0',
    score: query.score || '-1',
  }
  return request(`/api/voice/broadcast/channel/list`, data, createOption(query))
}
