import type { WyyQuery, WyyRequest } from '../util/types';

// 歌曲详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  // 歌曲数量不要超过1000
  query.ids = query.ids.split(/\s*,\s*/)
  const data = {
    c: '[' + query.ids.map((id: any) => '{"id":' + id + '}').join(',') + ']',
  }
  return request(`/api/v3/song/detail`, data, createOption(query, 'weapi'))
}
