import type { WyyQuery, WyyRequest } from '../util/types';

// 会员下载歌曲记录

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || '20',
    offset: query.offset || '0',
    total: 'true',
  }
  return request(`/api/member/song/downlist`, data, createOption(query))
}
