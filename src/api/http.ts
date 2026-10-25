/**
 * 统一的 fetch 实现。
 *
 * 在 Tauri 中使用 @tauri-apps/plugin-http（请求由 Rust 发出，绕过 WebView 的 CORS 限制）；
 * 在普通浏览器（例如直接打开 Vite dev server）中回退到全局 fetch。
 */
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const httpFetch: typeof fetch = isTauri
  ? ((input: RequestInfo | URL, init?: RequestInit) =>
      tauriFetch(input as any, init as any) as unknown as Promise<Response>)
  : globalThis.fetch.bind(globalThis)

export { isTauri }
