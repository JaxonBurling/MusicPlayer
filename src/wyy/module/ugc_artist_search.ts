import type { WyyQuery, WyyRequest } from '../util/types';

// 搜索歌手
// 可传关键字或者歌手id
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    keyword: query.keyword,
    limit: query.limit || 40,
  }
  return request(`/api/rep/ugc/artist/search`, data, createOption(query))
}
