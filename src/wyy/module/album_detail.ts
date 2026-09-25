import type { WyyQuery, WyyRequest } from '../util/types';

// 数字专辑详情
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
  }
  return request(
    `/api/vipmall/albumproduct/detail`,
    data,
    createOption(query, 'weapi'),
  )
}
