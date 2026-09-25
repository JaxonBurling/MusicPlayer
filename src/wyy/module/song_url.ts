import type { WyyQuery, WyyRequest } from '../util/types';

// 歌曲链接
import createOption from '../util/option';
export default async (query: WyyQuery, request: WyyRequest) => {
  const ids = String(query.id).split(',')
  const data = {
    ids: JSON.stringify(ids),
    br: parseInt(query.br || 999000),
  }
  const res = await request(
    `/api/song/enhance/player/url`,
    data,
    createOption(query),
  )
  // 根据id排序
  const result = res.body.data
  result.sort((a: any, b: any) => {
    return ids.indexOf(String(a.id)) - ids.indexOf(String(b.id))
  })
  return {
    status: 200,
    body: {
      code: 200,
      data: result,
    },
  }
}
