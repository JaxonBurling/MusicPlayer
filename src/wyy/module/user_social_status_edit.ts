import type { WyyQuery, WyyRequest } from '../util/types';

// 用户状态 - 编辑
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/social/user/status/edit`,
    {
      content: JSON.stringify({
        type: query.type,
        iconUrl: query.iconUrl,
        content: query.content,
        actionUrl: query.actionUrl,
      }),
    },
    createOption(query),
  )
}
