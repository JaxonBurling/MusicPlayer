/**
 * @fileoverview 网易云音乐 API 公共类型定义
 *
 * 集中定义 util 与 module 之间共用的类型，避免各处重复声明。
 */

/** 接口参数：各接口字段差异较大，统一使用宽松键值对 */
export type WyyQuery = Record<string, any>;

/** 统一响应格式（部分本地接口不返回 cookie，故为可选） */
export interface WyyResponse {
  status: number;
  body: any;
  cookie?: string[];
  [key: string]: any;
}

/** 底层请求函数签名（由 util/request 提供） */
export type WyyRequest = (
  uri: string,
  data?: Record<string, any>,
  options?: Record<string, any>,
) => Promise<WyyResponse>;

/** module 目录下接口模块的统一签名 */
export type WyyModule = (
  query: WyyQuery,
  request: WyyRequest,
) => Promise<WyyResponse> | WyyResponse;
