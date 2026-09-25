import type { WyyQuery, WyyRequest } from '../util/types';

// 相似MV

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    mvid: query.mvid,
  }
  return request(`/api/discovery/simiMV`, data, createOption(query, 'weapi'))
}
