import type { WyyQuery, WyyRequest } from '../util/types';

// 热门歌单分类

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/playlist/hottags`, {}, createOption(query, 'weapi'))
}
