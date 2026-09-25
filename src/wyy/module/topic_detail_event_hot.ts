import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    actid: query.actid,
  }
  return request(`/api/act/event/hot`, data, createOption(query, 'weapi'))
}
