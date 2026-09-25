import type { WyyQuery, WyyRequest } from '../util/types';

// DIFM电台 - 分类

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    sources: query.sources || '[0]',
  }
  return request(`/api/dj/difm/all/style/channel/v2`, data, createOption(query))
}
