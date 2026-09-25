import type { WyyQuery, WyyRequest } from '../util/types';

// 获取云盘歌词
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    userId: query.uid,
    songId: query.sid,
    lv: -1,
    kv: -1,
  }
  return request(`/api/cloud/lyric/get`, data, createOption(query, 'eapi'))
}
