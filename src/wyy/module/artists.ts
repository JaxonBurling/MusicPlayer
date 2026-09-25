import type { WyyQuery, WyyRequest } from '../util/types';

// 歌手单曲

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/v1/artist/${query.id}`, {}, createOption(query, 'weapi'))
}
