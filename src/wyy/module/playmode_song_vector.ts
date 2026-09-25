import type { WyyQuery, WyyRequest } from '../util/types';

// 云随机播放
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    ids: query.ids,
  }
  return request(`/api/playmode/song/vector/get`, data, createOption(query))
}
