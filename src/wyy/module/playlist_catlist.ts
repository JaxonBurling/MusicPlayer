import type { WyyQuery, WyyRequest } from '../util/types';

// 全部歌单分类

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(`/api/playlist/catalogue`, {}, createOption(query, 'eapi'))
}
