import type { WyyQuery, WyyRequest } from '../util/types';

// 用户详情

import createOption from '../util/option';
export default async (query: WyyQuery, request: WyyRequest) => {
  const res = await request(
    `/api/v1/user/detail/${query.uid}`,
    {},
    createOption(query, 'weapi'),
  )
  const result = JSON.stringify(res).replace(
    /avatarImgId_str/g,
    'avatarImgIdStr',
  )
  return JSON.parse(result)
}
