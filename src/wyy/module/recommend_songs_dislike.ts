import type { WyyQuery, WyyRequest } from '../util/types';

// 每日推荐歌曲-不感兴趣
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    resId: query.id, // 日推歌曲id
    resType: 4,
    sceneType: 1,
  }
  return request(
    `/api/v2/discovery/recommend/dislike`,
    data,
    createOption(query, 'weapi'),
  )
}
