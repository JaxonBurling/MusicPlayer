import type { WyyQuery, WyyRequest } from '../util/types';

// 最新专辑

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/discovery/newAlbum`, {}, createOption(query, 'weapi'))
}
