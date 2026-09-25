import type { WyyQuery, WyyRequest } from '../util/types';

// 从云盘获取歌曲下载链接

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    songId: query.id,
  }
  return request(`/api/cloud/dowonload`, data, createOption(query, 'eapi'))
}
