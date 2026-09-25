import type { WyyQuery, WyyRequest } from '../util/types';

// 用户详情

import createOption from '../util/option';
export default async (query: WyyQuery, request: WyyRequest) => {
  const data = {
    all: 'true',
    userId: query.uid,
  }
  const res = await request(
    `/api/w/v1/user/detail/${query.uid}`,
    data,
    createOption(query, 'eapi'),
  )
  // const result = JSON.stringify(res).replace(
  //   /avatarImgId_str/g,
  //   "avatarImgIdStr"
  // );
  // return JSON.parse(result);
  return res
}
