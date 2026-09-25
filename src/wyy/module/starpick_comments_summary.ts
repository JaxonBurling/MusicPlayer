import type { WyyQuery, WyyRequest } from '../util/types';

// 云村星评馆 - 简要评论列表
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    cursor: JSON.stringify({
      offset: 0,
      blockCodeOrderList: ['HOMEPAGE_BLOCK_NEW_HOT_COMMENT'],
      refresh: true,
    }),
  }
  return request(`/api/homepage/block/page`, data, createOption(query))
}
