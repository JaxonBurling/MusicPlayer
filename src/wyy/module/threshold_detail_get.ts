import type { WyyQuery, WyyRequest } from '../util/types';

// 获取达人达标信息
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/influencer/web/apply/threshold/detail/get`,
    data,
    createOption(query),
  )
}
