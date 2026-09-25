import type { WyyQuery, WyyRequest } from '../util/types';

// 听歌足迹 - 本周/本月收听时长
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/content/activity/listen/data/realtime/report`,
    {
      type: query.type || 'week', //周 week 月 month
    },
    createOption(query),
  )
}
