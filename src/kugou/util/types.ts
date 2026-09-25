/**
 * @fileoverview 酷狗 API 公共类型定义
 *
 * 该文件集中定义 util 与 module 之间共用的类型，避免各处重复声明：
 * - KugouParams: 接口参数（宽松键值对，业务字段各异）
 * - UseAxiosOptions / UseAxiosResponse: 底层请求的入参与统一响应
 * - UseAxios: createRequest 暴露给 module 的请求函数
 * - KugouModule: module 目录下各接口模块的统一签名
 */

/** 接口参数：各接口字段差异较大，统一使用宽松键值对 */
export type KugouParams = Record<string, any>;

/** 签名加密方式 */
export type EncryptType = 'android' | 'web' | 'register';

/** 底层请求配置（createRequest 入参） */
export interface UseAxiosOptions {
  method?: 'get' | 'GET' | 'post' | 'POST' | (string & {});
  url: string;
  baseURL?: string;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, any>;
  encryptType?: EncryptType | (string & {});
  cookie?: Record<string, any>;
  encryptKey?: boolean;
  clearDefaultParams?: boolean;
  notSignature?: boolean;
  notSign?: boolean;
  responseType?: string;
  ip?: string;
  realIP?: string;
  [key: string]: any;
}

/** 统一响应格式 */
export interface UseAxiosResponse {
  status: number;
  body: any;
  cookie: string[];
  headers: Record<string, any>;
}

/** 请求函数签名 */
export type UseAxios = (
  options: UseAxiosOptions
) => Promise<UseAxiosResponse>;

/** module 目录下接口模块的统一签名 */
export type KugouModule = (
  params: KugouParams,
  useAxios: UseAxios
) => Promise<UseAxiosResponse> | UseAxiosResponse;
