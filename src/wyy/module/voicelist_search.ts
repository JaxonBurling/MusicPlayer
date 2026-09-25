import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    keyword: query.keyword || '',
    scene: 'normal',
    limit: query.limit || '10',
    offset: query.offset || '30',
    e_r: true,
  }
  return request(`/api/search/voicelist/get`, data, createOption(query))
}
