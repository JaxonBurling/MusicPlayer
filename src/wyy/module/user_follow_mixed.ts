import type { WyyQuery, WyyRequest } from '../util/types';

// 当前账号关注的用户/歌手

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const size = query.size || 30
  const cursor = query.cursor || 0
  const scene = query.scene || 0 // 0: 所有关注 1: 关注的歌手 2: 关注的用户
  const data = {
    authority: 'false',
    page: JSON.stringify({
      size: size,
      cursor: cursor,
    }),
    scene: scene,
    size: size,
    sortType: '0',
  }
  return request(
    `/api/user/follow/users/mixed/get/v2`,
    data,
    createOption(query),
  )
}
