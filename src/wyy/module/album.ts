import type { WyyQuery, WyyRequest } from '../util/types';

// 专辑内容

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/v1/album/${query.id}`, {}, createOption(query, 'weapi'))
}
