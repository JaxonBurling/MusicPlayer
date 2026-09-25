import type { WyyQuery, WyyRequest } from '../util/types';

// 获取 VIP 信息

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/music-vip-membership/front/vip/info`,
    {
      userId: query.uid || '',
    },
    createOption(query, 'weapi'),
  )
}
