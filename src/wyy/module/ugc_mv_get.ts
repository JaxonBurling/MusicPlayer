import type { WyyQuery, WyyRequest } from '../util/types';

// mv简要百科信息
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    mvId: query.id,
  }
  return request(`/api/rep/ugc/mv/get`, data, createOption(query))
}
