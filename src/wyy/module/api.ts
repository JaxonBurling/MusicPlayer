import type { WyyQuery, WyyRequest } from '../util/types';

import { cookieToJson } from '../util/index';
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const uri = query.uri
  let data: Record<string, any> = {}
  try {
    data =
      typeof query.data === 'string' ? JSON.parse(query.data) : query.data || {}
    if (typeof data.cookie === 'string') {
      data.cookie = cookieToJson(data.cookie)
      query.cookie = data.cookie
    }
  } catch (e) {
    data = {}
  }

  const crypto = query.crypto || ''

  const res = request(uri, data, createOption(query, crypto))
  return res
}
