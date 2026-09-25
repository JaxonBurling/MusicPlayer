import type { WyyQuery, WyyRequest } from '../util/types';

import pkg from '../../../package.json';
export default (_query: WyyQuery, _request: WyyRequest) => {
  return new Promise((resolve: any) => {
    return resolve({
      code: 200,
      status: 200,
      body: {
        code: 200,
        data: {
          version: pkg.version,
        },
      },
    })
  })
}
