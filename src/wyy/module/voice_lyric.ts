import type { WyyQuery, WyyRequest } from '../util/types';

import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    programId: query.id,
  }
  return request(`/api/voice/lyric/get`, data, createOption(query))
}
