import type { WyyQuery, WyyRequest } from '../util/types';

// 获取指定维度音乐排行榜详情

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    chartCode: query.chartCode,
    targetId: query.targetId,
    targetType: query.targetType,
  }
  return request(`/api/chart/detail`, data, createOption(query))
}
