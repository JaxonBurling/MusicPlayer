import type { WyyQuery, WyyRequest } from '../util/types';

﻿// 转发动态

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    forwards: query.forwards,
    id: query.evId,
    eventUserId: query.uid,
  }
  return request(`/api/event/forward`, data, createOption(query))
}
