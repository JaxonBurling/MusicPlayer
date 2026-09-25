import type { WyyQuery, WyyRequest } from '../util/types';

// 夹带私货的东西就不要放在这里了

export default async (_query: WyyQuery, _request: WyyRequest) => {
  return { status: 200, body: { code: 200, data: [] } }
}
