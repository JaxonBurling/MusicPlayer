import type { WyyQuery, WyyRequest } from '../util/types';

// 听歌足迹 - 今日收听
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/content/activity/listen/data/today/song/play/rank`,
    {},
    createOption(query),
  )
}
