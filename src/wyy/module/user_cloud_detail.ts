import type { WyyQuery, WyyRequest } from '../util/types';

// 云盘数据详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const id = query.id.replace(/\s/g, '').split(',')
  const data = {
    songIds: id,
  }
  return request(`/api/v1/cloud/get/byids`, data, createOption(query, 'weapi'))
}
