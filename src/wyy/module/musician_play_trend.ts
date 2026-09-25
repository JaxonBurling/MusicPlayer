import type { WyyQuery, WyyRequest } from '../util/types';

// 音乐人歌曲播放趋势

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    startTime: query.startTime,
    endTime: query.endTime,
  }
  return request(
    `/api/creator/musician/play/count/statistic/data/trend/get`,
    data,
    createOption(query, 'weapi'),
  )
}
