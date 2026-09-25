import type { WyyQuery, WyyRequest } from '../util/types';

// 广播电台 - 电台信息

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    channelId: query.id,
  }
  return request(
    `/api/voice/broadcast/channel/currentinfo`,
    data,
    createOption(query),
  )
}
