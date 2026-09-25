import type { WyyQuery, WyyRequest } from '../util/types';

// 听歌足迹 - 总收听时长
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/content/activity/listen/data/total`,
    {},
    createOption(query),
  )
}
