import type { WyyQuery, WyyRequest } from '../util/types';

// 听歌排行

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    uid: query.uid,
    type: query.type || 0, // 1: 最近一周, 0: 所有时间
  }
  return request(`/api/v1/play/record`, data, createOption(query, 'weapi'))
}
