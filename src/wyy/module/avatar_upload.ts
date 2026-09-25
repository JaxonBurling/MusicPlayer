import type { WyyQuery, WyyRequest } from '../util/types';

import uploadPlugin from '../plugins/upload';
import createOption from '../util/option';
export default async (query: WyyQuery, request: WyyRequest) => {
  const uploadInfo = await uploadPlugin(query, request)
  const res = await request(
    `/api/user/avatar/upload/v1`,
    {
      imgid: uploadInfo.imgId,
    },
    createOption(query),
  )
  return {
    status: 200,
    body: {
      code: 200,
      data: {
        ...uploadInfo,
        ...res.body,
      },
    },
  }
}
