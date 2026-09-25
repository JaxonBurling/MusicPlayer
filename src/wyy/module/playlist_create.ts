import type { WyyQuery, WyyRequest } from '../util/types';

// 创建歌单

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    name: query.name,
    privacy: query.privacy || '0', // 0 普通歌单, 10 隐私歌单
    type: query.type || 'NORMAL', // 默认 NORMAL, VIDEO 视频歌单, SHARED 共享歌单
  }
  return request(`/api/playlist/create`, data, createOption(query, 'weapi'))
}
