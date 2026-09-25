import type { WyyQuery, WyyRequest } from '../util/types';

// 收藏与取消收藏歌单
import __config from '../util/config.json';
const APP_CONF = __config.APP_CONF as Record<string, any>;
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const path = query.t == 1 ? 'subscribe' : 'unsubscribe'
  const data = {
    id: query.id,
    ...(query.t === 1
      ? { checkToken: query.checkToken || APP_CONF.checkToken }
      : {}),
  }
  query.checkToken = true // 强制开启checkToken
  return request(`/api/playlist/${path}`, data, createOption(query, 'eapi'))
}
