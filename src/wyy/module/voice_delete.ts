import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    ids: query.ids,
  }
  return request('/api/content/voice/delete', data, createOption(query))
}
