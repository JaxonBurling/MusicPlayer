import type { WyyQuery, WyyRequest } from '../util/types';

// 我创建的播客声音

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || 20,
  }
  return request(
    `/api/social/my/created/voicelist/v1`,
    data,
    createOption(query, 'weapi'),
  )
}
