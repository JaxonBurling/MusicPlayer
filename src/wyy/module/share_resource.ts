import type { WyyQuery, WyyRequest } from '../util/types';

// 分享歌曲到动态

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    type: query.type || 'song', // song,playlist,mv,djprogram,djradio,noresource
    msg: query.msg || '',
    id: query.id || '',
  }
  return request(`/api/share/friends/resource`, data, createOption(query))
}
