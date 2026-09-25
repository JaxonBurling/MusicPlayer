import type { WyyQuery, WyyRequest } from '../util/types';

// 获取用户的创建歌单列表

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || '100',
    offset: query.offset || '0',
    userId: query.uid,
    isWebview: 'true',
    includeRedHeart: 'true',
    includeTop: 'true',
  }
  return request(`/api/user/playlist/create`, data, createOption(query))
}
