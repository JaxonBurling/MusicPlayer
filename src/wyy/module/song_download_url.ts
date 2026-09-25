import type { WyyQuery, WyyRequest } from '../util/types';

// 获取客户端歌曲下载链接

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    id: query.id,
    br: parseInt(query.br || 999000),
  }
  return request(`/api/song/enhance/download/url`, data, createOption(query))
}
