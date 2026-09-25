import type { WyyQuery, WyyRequest } from '../util/types';

// 听歌足迹 - 歌曲播放排行 (Top20)
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/content/activity/listen/data/song/play/rank`,
    {
      type: query.type || 'month', //周 week 月 month
      endTime: query.endTime, // 不填就是本周/月的
    },
    createOption(query),
  )
}
