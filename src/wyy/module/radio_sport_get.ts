import type { WyyQuery, WyyRequest } from '../util/types';

// 跑步漫游

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    bpm: query.bpm || 50,
  }
  return request(`/api/radio/sport/get`, data, createOption(query))
}
