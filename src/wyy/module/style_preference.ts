import type { WyyQuery, WyyRequest } from '../util/types';

// 曲风偏好

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  return request(
    `/api/tag/my/preference/get`,
    data,
    createOption(query, 'weapi'),
  )
}
