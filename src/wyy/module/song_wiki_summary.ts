import type { WyyQuery, WyyRequest } from '../util/types';

// 音乐百科基础信息
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songId: query.id,
  }
  return request(`/api/song/play/about/block/page`, data, createOption(query))
}
