import type { WyyQuery, WyyRequest } from '../util/types';

// 听歌足迹 - 周/月/年收听报告
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/content/activity/listen/data/report`,
    {
      type: query.type || 'week', //周 week 月 month 年 year
      endTime: query.endTime, // 不填就是本周/月的
    },
    createOption(query),
  )
}
