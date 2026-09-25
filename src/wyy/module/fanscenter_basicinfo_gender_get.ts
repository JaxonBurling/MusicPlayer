import type { WyyQuery, WyyRequest } from '../util/types';

// 粉丝性别比例
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/fanscenter/basicinfo/gender/get`,
    data,
    createOption(query),
  )
}
