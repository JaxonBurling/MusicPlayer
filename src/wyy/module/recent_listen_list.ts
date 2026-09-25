import type { WyyQuery, WyyRequest } from '../util/types';

// 最近听歌列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(`/api/pc/recent/listen/list`, data, createOption(query))
}
