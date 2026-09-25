import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default async (query: WyyQuery, request: WyyRequest) => {
  const data = {
    qrCode: query.qr,
  }
  const res = await request(
    `/api/frontrisk/verify/qrcodestatus`,
    data,
    createOption(query, 'weapi'),
  )
  return res
}
