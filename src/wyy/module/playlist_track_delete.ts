import type { WyyQuery, WyyRequest } from '../util/types';

// 收藏单曲到歌单 从歌单删除歌曲

import createOption from '../util/option';
export default async (query: WyyQuery, request: WyyRequest) => {
  query.ids = query.ids || ''
  const data = {
    id: query.id,
    tracks: JSON.stringify(
      query.ids.split(',').map((item: any) => {
        return { type: 3, id: item }
      }),
    ),
  }

  return request(
    `/api/playlist/track/delete`,
    data,
    createOption(query, 'weapi'),
  )
}
