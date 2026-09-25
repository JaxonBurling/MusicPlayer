import type { WyyQuery, WyyRequest } from '../util/types';

// 更新歌单描述

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    desc: query.desc,
  }
  return request(`/api/playlist/desc/update`, data, createOption(query))
}
