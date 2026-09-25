import type { WyyQuery, WyyRequest } from '../util/types';

// 网易云歌曲解灰(适配SPlayer的UNM-Server)
// 支持qq音乐、酷狗音乐、酷我音乐、咪咕音乐、第三方网易云API等等(来自GD音乐台)

import logger from '../util/logger';
import { matchID } from '@neteasecloudmusicapienhanced/unblockmusic-utils';

export default async (query: WyyQuery, _request: WyyRequest) => {
  try {
    const result = await matchID(query.id, query.source);
    const proxy = process.env.PROXY_URL;
    logger.info('开始解灰', query.id, result);
    const useProxy = process.env.ENABLE_PROXY || 'false';
    if (result.data.url && result.data.url.includes('kuwo')) {
      result.proxyUrl =
        useProxy === 'true' ? proxy + result.data.url : result.data.url;
    }
    return {
      status: 200,
      body: {
        code: 200,
        data: result.data.url,
        proxyUrl: result.proxyUrl || '',
      },
    };
  } catch (e: any) {
    return {
      status: 500,
      body: {
        code: 500,
        msg: e.message || 'unblock error',
        data: [],
      },
    };
  }
};
