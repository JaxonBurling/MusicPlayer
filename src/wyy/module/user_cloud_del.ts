import type { WyyQuery, WyyRequest } from '../util/types';

// 云盘歌曲删除

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songIds: [query.id],
  }
  return request(`/api/cloud/del`, data, createOption(query, 'weapi'))
}
