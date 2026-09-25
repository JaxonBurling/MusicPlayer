import type { WyyQuery, WyyRequest } from '../util/types';

// 电台节目列表
import { toBoolean } from '../util';
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    radioId: query.rid,
    limit: query.limit || 30,
    offset: query.offset || 0,
    asc: toBoolean(query.asc),
  }
  return request(`/api/dj/program/byradio`, data, createOption(query, 'weapi'))
}
