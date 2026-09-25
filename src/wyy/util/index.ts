/**
 * @fileoverview 网易云 API 通用工具
 *
 * 提供 Cookie 转换、随机数/IP 生成、设备与 chainId 生成等工具函数。
 *
 * @module util/index
 */

import fs from 'fs';
import logger from './logger';

/** IP 段信息 */
interface IPRange {
  start: number;
  end: number;
  count: number;
  cidr: string;
}

/** IP 段数组（附带总数量） */
type IPRangeList = IPRange[] & { totalCount?: number };

/** IP 地址转整数 */
function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  const a = (parts[0] << 24) >>> 0;
  const b = parts[1] << 16;
  const c = parts[2] << 8;
  const d = parts[3];
  return a + b + c + d;
}

/** 整数转 IP 地址 */
function intToIp(int: number): string {
  return [
    (int >>> 24) & 0xff,
    (int >>> 16) & 0xff,
    (int >>> 8) & 0xff,
    int & 0xff,
  ].join('.');
}

/** 解析 CIDR 格式的 IP 段 */
function parseCIDR(cidr: string): IPRange {
  const [ipStr, prefixLengthStr] = cidr.split('/');
  const prefixLength = parseInt(prefixLengthStr, 10);

  const ipInt = ipToInt(ipStr);
  const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
  const start = (ipInt & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;
  const count = end - start + 1;

  return { start, end, count, cidr };
}

/** 从 china_ip_ranges.txt 加载中国 IP 段（CIDR 格式） */
const chinaIPRanges = (function loadChinaIPRanges(): IPRangeList {
  try {
    // 打包为单文件时 import.meta.url 可能不可用，此时直接回退
    const base = (import.meta as any).url as string | undefined;
    if (!base) return Object.assign([], { totalCount: 0 }) as IPRangeList;
    const filePath = new URL('../data/china_ip_ranges.txt', base);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'));

    const arr = [] as unknown as IPRangeList;
    let total = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const range = parseCIDR(line);
      arr.push(range);
      total += range.count;
    }

    // 按IP段大小排序，提高随机选择效率
    arr.sort((a, b) => b.count - a.count);

    // attach total for convenience
    arr.totalCount = total;

    return arr;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to load china_ip_ranges.txt:', message);
    // 返回空数组，generateRandomChineseIP会使用兜底逻辑
    return Object.assign([], { totalCount: 0 }) as IPRangeList;
  }
})();

const floor = Math.floor;
const random = Math.random;
const keys = Object.keys;

// 预编译encodeURIComponent以减少查找开销
const encode = encodeURIComponent;

/** 生成 [min, max] 范围内的随机整数 */
function getRandomInt(min: number, max: number): number {
  return floor(random() * (max - min + 1)) + min;
}

/** 生成 1~255 的随机 IP 段 */
function generateIPSegment(): number {
  return getRandomInt(1, 255);
}

/** 从 cookie 字符串中获取指定值 */
function getCookieValue(cookieStr: string, name: string): string {
  if (!cookieStr) return '';

  const cookies = '; ' + cookieStr;
  const parts = cookies.split('; ' + name + '=');
  if (parts.length === 2) return parts.pop()!.split(';').shift()!;
  return '';
}

/** 字符串布尔值转换 */
function toBoolean(val: any): any {
  if (typeof val === 'boolean') return val;
  if (val === '') return val;
  return val === 'true' || val == '1';
}

/** Cookie 字符串转对象 */
function cookieToJson(cookie: string): Record<string, string> {
  if (!cookie) return {};
  const cookieArr = cookie.split(';');
  const obj: Record<string, string> = {};

  for (let i = 0, len = cookieArr.length; i < len; i++) {
    const item = cookieArr[i];
    const arr = item.split('=');
    if (arr.length === 2) {
      obj[arr[0].trim()] = arr[1].trim();
    }
  }
  return obj;
}

/** Cookie 对象转字符串 */
function cookieObjToString(cookie: Record<string, any>): string {
  const cookieKeys = keys(cookie);
  const result: string[] = [];

  for (let i = 0, len = cookieKeys.length; i < len; i++) {
    const key = cookieKeys[i];
    result[i] = `${encode(key)}=${encode(cookie[key])}`;
  }

  return result.join('; ');
}

/** 生成随机数（保持原有逻辑） */
function getRandom(num: number): number {
  const randomValue = random();
  const floorValue = floor(randomValue * 9 + 1);
  const powValue = Math.pow(10, num - 1);
  const randomNum = floor((randomValue + floorValue) * powValue);
  return randomNum;
}

/** 生成随机中国 IP */
function generateRandomChineseIP(): string {
  // 从预定义的中国 IP 段中按权重随机选择一个段，然后在该段内生成随机 IP
  const total = chinaIPRanges.totalCount || 0;
  if (!total) {
    // 兜底：回退到旧逻辑（随机 116.x 前缀）
    const fallback = `116.${getRandomInt(25, 94)}.${generateIPSegment()}.${generateIPSegment()}`;
    logger.info('Generated Random Chinese IP (fallback):', fallback);
    return fallback;
  }

  // 选择一个全局随机偏移（[0, total)）
  let offset = Math.floor(random() * total);
  let chosen: IPRange | null = null;
  for (let i = 0; i < chinaIPRanges.length; i++) {
    const seg = chinaIPRanges[i];
    if (offset < seg.count) {
      chosen = seg;
      break;
    }
    offset -= seg.count;
  }

  // 如果没有选中（理论上不应该发生），回退到最后一个段
  if (!chosen) chosen = chinaIPRanges[chinaIPRanges.length - 1];

  // 在段内随机生成一个 IP（使用段真实的数值范围）
  const segSize = chosen.end - chosen.start + 1;
  const ipInt = chosen.start + Math.floor(random() * segSize);
  const ip = intToIp(ipInt);
  logger.info('Generated Random Chinese IP:', ip, 'from CIDR:', chosen.cidr);
  return ip;
}

/** 生成 chainId */
function generateChainId(cookie: string): string {
  const version = 'v1';
  const randomNum = Math.floor(Math.random() * 1e6);
  const deviceId =
    getCookieValue(cookie, 'sDeviceId') || 'unknown-' + randomNum;
  const platform = 'web';
  const action = 'login';
  const timestamp = Date.now();

  return `${version}_${deviceId}_${platform}_${action}_${timestamp}`;
}

/** 生成随机设备 ID */
function generateDeviceId(): string {
  const hexChars = '0123456789ABCDEF';
  const chars: string[] = [];
  for (let i = 0; i < 52; i++) {
    const randomIndex = Math.floor(Math.random() * hexChars.length);
    chars.push(hexChars[randomIndex]);
  }
  return chars.join('');
}

export {
  toBoolean,
  cookieToJson,
  cookieObjToString,
  getRandom,
  generateRandomChineseIP,
  generateChainId,
  generateDeviceId,
};
