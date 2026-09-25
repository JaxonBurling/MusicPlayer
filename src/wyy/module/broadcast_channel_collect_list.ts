import type { WyyQuery, WyyRequest } from '../util/types';

// 广播电台 - 我的收藏

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    contentType: 'BROADCAST',
    limit: query.limit || '99999',
    timeReverseOrder: 'true',
    startDate: '4762584922000',
  }
  return request(`/api/content/channel/collect/list`, data, createOption(query))
}
