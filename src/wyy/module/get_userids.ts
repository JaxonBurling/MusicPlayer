import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    nicknames: query.nicknames,
  }
  return request(`/api/user/getUserIds`, data, createOption(query, 'weapi'))
}
