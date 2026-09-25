import type { WyyQuery, WyyRequest } from '../util/types';

// 编辑用户信息

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    // avatarImgId: '0',
    birthday: query.birthday,
    city: query.city,
    gender: query.gender,
    nickname: query.nickname,
    province: query.province,
    signature: query.signature,
  }
  return request(`/api/user/profile/update`, data, createOption(query))
}
