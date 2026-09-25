import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
import logger from '../util/logger';
export default async (query: WyyQuery, request: WyyRequest) => {
  query.ids = query.ids || ''
  const data = {
    id: query.pid,
    tracks: JSON.stringify(
      query.ids.split(',').map((item: any) => {
        return { type: 3, id: item }
      }),
    ),
  }
  logger.info(data)

  return request(`/api/playlist/track/add`, data, createOption(query, 'weapi'))
}
