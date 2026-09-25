import type { WyyQuery, WyyRequest } from '../util/types';

// 粉丝省份比例
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/fanscenter/basicinfo/province/get`,
    data,
    createOption(query),
  )
}
