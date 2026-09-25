import type { WyyQuery, WyyRequest } from '../util/types';

// 购买数字专辑

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    business: 'Album',
    paymentMethod: query.payment,
    digitalResources: JSON.stringify([
      {
        business: 'Album',
        resourceID: query.id,
        quantity: query.quantity,
      },
    ]),
    from: 'web',
  }
  return request(
    `/api/ordering/web/digital`,
    data,
    createOption(query, 'weapi'),
  )
}
