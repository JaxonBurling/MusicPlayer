import type { WyyQuery, WyyRequest } from '../util/types';

//声音搜索
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {
    limit: query.limit || '200',
    offset: query.offset || '0',
    name: query.name || null,
    displayStatus: query.displayStatus || null,
    type: query.type || null,
    voiceFeeType: query.voiceFeeType || null,
    radioId: query.voiceListId,
  }
  return request('/api/voice/workbench/voice/list', data, createOption(query))
}
