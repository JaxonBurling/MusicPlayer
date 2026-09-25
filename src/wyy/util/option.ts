/**
 * @fileoverview 请求选项构建
 * @module util/option
 */

import type { WyyQuery } from './types';

/**
 * 根据查询参数构建请求选项
 * @param query 查询参数
 * @param crypto 默认加密方式
 * @returns 请求选项
 */
const createOption = (query: WyyQuery, crypto = '') => {
  return {
    crypto: query.crypto || crypto || '',
    cookie: query.cookie || process.env.NETEASE_COOKIE,
    ua: query.ua || '',
    proxy: query.proxy,
    realIP: query.realIP,
    randomCNIP:
      process.env.ENABLE_RANDOM_CN_IP === 'true'
        ? !['false', false].includes(query.randomCNIP)
        : ['true', true].includes(query.randomCNIP),
    e_r: query.e_r || undefined,
    domain: query.domain || '',
    checkToken: query.checkToken || false,
  };
};

export default createOption;
