import type { WyyQuery, WyyRequest } from '../util/types';

// 歌手介绍

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(`/api/artist/introduction`, data, createOption(query, 'weapi'))
}
