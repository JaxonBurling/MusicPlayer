import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    nickname: query.nickname,
  }
  return request(`/api/nickname/duplicated`, data, createOption(query, 'weapi'))
}
