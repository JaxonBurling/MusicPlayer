import type { WyyQuery, WyyRequest } from '../util/types';

// 听歌足迹 - 年度听歌足迹
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/content/activity/listen/data/year/report`,
    {},
    createOption(query),
  )
}
