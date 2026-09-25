/**
 * 构建本地 API 服务 sidecar：
 * 1. 用 esbuild 将 server/index.ts 打包为单文件 CommonJS
 * 2. 用 @yao-pkg/pkg 生成对应平台的可执行文件，输出到 src-tauri/binaries/
 *
 * 用法：node server/build.mjs
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

mkdirSync('server/dist', { recursive: true });
mkdirSync('src-tauri/binaries', { recursive: true });

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile: 'server/dist/server.cjs',
  // 避免将 node 内置模块打进产物
  external: ['node:*'],
  logLevel: 'info',
});

const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';

const triple = isWin
  ? 'x86_64-pc-windows-msvc'
  : isMac
    ? process.arch === 'arm64'
      ? 'aarch64-apple-darwin'
      : 'x86_64-apple-darwin'
    : 'x86_64-unknown-linux-gnu';

const pkgTarget = isWin
  ? 'node22-win-x64'
  : isMac
    ? process.arch === 'arm64'
      ? 'node22-macos-arm64'
      : 'node22-macos-x64'
    : 'node22-linux-x64';

const ext = isWin ? '.exe' : '';
const outfile = `src-tauri/binaries/server-${triple}${ext}`;

execSync(
  `pnpm exec pkg server/dist/server.cjs --targets ${pkgTarget} --output "${outfile}"`,
  { stdio: 'inherit' },
);

console.log(`[build] sidecar 生成完成: ${outfile}`);
