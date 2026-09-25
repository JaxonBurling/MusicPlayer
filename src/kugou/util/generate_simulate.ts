/**
 * @fileoverview 酷狗音乐 API 行为指纹模拟生成器
 *
 * 本模块用于在服务端生成模拟的用户行为指纹数据，替代浏览器端 WASM 的功能。
 * 主要用于自动化请求场景（如批量登录、接口调用等），绕过酷狗的行为检测机制。
 *
 * 核心功能：
 * 1. 生成模拟的鼠标移动轨迹（贝塞尔曲线 + 随机抖动）
 * 2. 生成模拟的页面交互事件（滚动、窗口 resize 等）
 * 3. 使用 AES-128-CBC 加密行为数据得到 EDT（Encrypted Data Token）
 * 4. 使用 RSA-OAEP SHA-256 加密 AES 密钥得到 SID（Session ID）
 * 5. 服务端用 RSA 私钥解密 SID 得到 AES 密钥，再用 AES 密钥解密 EDT 还原行为数据
 *
 * 加密方案：
 *   明文（行为数据）→ AES-128-CBC 加密 → EDT（Base64）
 *   AES 密钥 → RSA-OAEP SHA-256 加密 → SID（Base64）
 *
 * @module generate_simulate
 * @requires crypto-es - AES/MD5 加密库
 * @requires node-forge - RSA 加密库
 * @requires ./util - 工具函数（randomString、generateWebGLHash）
 */

import { AES, CBC, Hex, MD5, Pkcs7, Utf8 } from 'crypto-es';
import forge from 'node-forge';
import { randomString, generateWebGLHash } from './util';

/**
 * RSA 公钥（PEM 格式）
 * 从酷狗 WASM 二进制中提取的 SPKI 公钥，用于 RSA-OAEP SHA-256 加密 AES 密钥
 * 算法: RSA-2048，公钥指数 65537 (0x10001)
 *
 * 服务端持有对应的私钥，用于解密 SID 获取 AES 密钥
 */
const publicKey = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoW2+Ylo8ALePSQTP0xBF\nlFmEOHvBD9tS+s7DBlfKEu3RzzvZTaX1JtYbX4+AVUqj6ARz8IM+CKByqGFvbHN/\nW64XxNI+q7z36ajCL3VTJ2W5G9MCJitc6oGbire4NQfhaEq0nC+hxBWQvCbIFflA\n2ItrLUbSU7z1bHA/a+jlQm4OWvY+IKnTryOJTPuT1yNOVjbJ8wBLKy2DgQr9pPqW\nPmEQtGpR5IM9V8Kao6PaSdKYOWGbX3i2+RzIKhvZUxxtJwdVbqPlDPlW9h4/xIBc\n56Lgvr4aIl8nFtwbj4UJVUTFuGrs0tY9H/tXvZ22dUCKuGxW/gW7ZF+gXz6vHtYa\nrQIDAQAB\n-----END PUBLIC KEY-----`;

/**
 * AES 初始化向量（固定值）
 * ASCII 解码为 "kugousecurity123"
 * 与浏览器端 WASM 中硬编码的 IV 一致，每次加密都使用相同的 IV
 */
const iv = 'kugousecurity123';

/**
 * 哨兵值（接近 0xFFFFFFFF 的随机值）
 * WASM 中每条事件记录后都会跟一条哨兵记录，用于标记事件结束或表示"无数据"
 * 每次调用 generateSimulate 时会重新生成，增加指纹随机性
 */
let SENTINEL = 0xffffffff - Math.floor(Math.random() * 20);

/** generateEDTData 配置项 */
interface EdtDataOptions {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  mousePoints: number;
}

/** 鼠标轨迹坐标点 */
interface Point {
  x: number;
  y: number;
}

/**
 * 生成 EDT 中的 data 字段（用户行为指纹数据）
 *
 * 模拟真实用户在页面上的交互行为，包括：
 * - 窗口加载/resize 事件（type 6）
 * - 页面滚动事件（type 5）
 * - 鼠标移动轨迹（type 3，贝塞尔曲线生成）
 *
 * 事件编码格式：各条目用冒号 `:` 分隔，每个条目的字段用逗号 `,` 分隔
 *
 * @param opts 配置项
 * @returns 编码后的 data 字段字符串
 */
function generateEDTData(opts: EdtDataOptions): string {
  const { startX, startY, endX, endY, mousePoints } = opts;
  const entries: string[] = []; // 所有事件条目
  let ts = 0;                   // 累计时间戳（毫秒），从 0 开始递增
  let ei = 0;                   // 全局事件索引（用于 type-5/6 事件的标识）

  // --- 初始化: 两个 type-5 零事件 ---
  entries.push(f5(0, 0));
  entries.push(fs5(0));
  entries.push(f5(0, 0));
  entries.push(fs5(0));

  // --- 窗口事件 (type 6) ---
  ts += ri(5, 20);                    // 随机延迟 5-20ms（模拟页面加载耗时）
  entries.push(f6(ts, ei, 750, 500)); // 窗口事件记录
  entries.push(fs6(ei, 750, 500));    // 对应的哨兵记录
  ei++;

  // --- 滚动事件 (type 5) ---
  for (let i = 0; i < 3; i++) {
    ts += ri(80, 600); // 滚动间隔 80-600ms
    entries.push(f5(ts, ei));
    entries.push(fs5(ei));
    ei++;
  }

  // --- 鼠标轨迹 (type 3) ---
  const path = bezierPath(startX, startY, endX, endY, mousePoints);
  let si = 0; // 子索引（0 或 1，交替变化）
  for (let i = 0; i < path.length; i++) {
    const { x, y } = path[i];
    ts += ri(8, 50); // 鼠标移动间隔 8-50ms
    entries.push(f3(ts, si, Math.round(x), Math.round(y)));
    entries.push(fs3(si, Math.round(x), Math.round(y)));

    // 每隔 12 帧插入一个滚动事件
    if (i > 0 && i % 12 === 0) {
      ts += ri(20, 60);
      entries.push(f5(ts, ei));
      entries.push(fs5(ei));
      ei++;
    }
    si = (si + 1) % 2; // 子索引在 0 和 1 之间交替
  }

  // --- 结束事件 ---
  ts += ri(5, 30);
  entries.push(f3(ts, 1, Math.round(endX + ri(-5, 5)), Math.round(endY + ri(-5, 5))));
  entries.push(fs3(1, Math.round(endX), Math.round(endY)));

  return entries.join(':');
}

// ============================================================
// 贝塞尔曲线鼠标路径生成
// ============================================================

/**
 * 用三阶贝塞尔曲线生成模拟真人的鼠标移动路径
 *
 * 三阶贝塞尔公式: B(t) = (1-t)³·P0 + 3(1-t)²t·P1 + 3(1-t)t²·P2 + t³·P3
 *
 * @param sx 起点 X
 * @param sy 起点 Y
 * @param ex 终点 X
 * @param ey 终点 Y
 * @param n 采样点数（越多轨迹越平滑）
 * @returns 路径点数组，长度为 n+1
 */
function bezierPath(sx: number, sy: number, ex: number, ey: number, n: number): Point[] {
  const c1x = sx + (ex - sx) * 0.3 + ri(-80, 80);
  const c1y = sy + (ey - sy) * 0.2 + ri(-60, 60);
  const c2x = sx + (ex - sx) * 0.7 + ri(-60, 60);
  const c2y = sy + (ey - sy) * 0.8 + ri(-40, 40);

  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 参数 t 从 0 到 1，均匀采样
    const u = 1 - t;

    const x = u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex;
    const y = u * u * u * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey;

    // 抖动幅度: 起点大（3px），逐渐减小到 0.5px
    const jitter = Math.max(0.5, 3 - t * 2.5);
    pts.push({
      x: x + (Math.random() - 0.5) * jitter,
      y: y + (Math.random() - 0.5) * jitter,
    });
  }
  return pts;
}

// ============================================================
// 事件记录格式化函数
// ============================================================

/** 格式化 type-3 事件（鼠标/触摸移动） */
function f3(t: number, i: number, x: number, y: number): string {
  return `3,${t},${i},${x},${y}`;
}

/** 格式化 type-5 事件（滚动/计时） */
function f5(t: number, i: number): string {
  return `5,${t},${i}`;
}

/** 格式化 type-6 事件（窗口事件） */
function f6(t: number, i: number, x: number, y: number): string {
  return `6,${t},${i},${x},${y}`;
}

/** 格式化 type-3 哨兵记录 */
function fs3(i: number, x: number, y: number): string {
  return `3,${SENTINEL},${i},${x},${y}`;
}

/** 格式化 type-5 哨兵记录 */
function fs5(i: number): string {
  return `5,${SENTINEL},${i}`;
}

/** 格式化 type-6 哨兵记录 */
function fs6(i: number, x: number, y: number): string {
  return `6,${SENTINEL},${i},${x},${y}`;
}

/**
 * 生成 [min, max] 范围内的随机整数（包含两端）
 * @param min 最小值
 * @param max 最大值
 * @returns 随机整数
 */
function ri(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================
// 核心导出函数
// ============================================================

/** generateSimulate 返回值 */
interface SimulateResult {
  edt: string;
  sid: string;
}

/**
 * 生成模拟的 sid 和 edt 加密数据
 *
 * 完整流程：
 * 1. 生成随机 AES-128 密钥（16 字节，取 MD5 哈希的前 16 字符）
 * 2. 随机化鼠标轨迹参数（起点、终点、采样点数）
 * 3. 生成模拟行为数据（鼠标轨迹 + 滚动 + 窗口事件）
 * 4. 拼接完整明文: mid=xxx;userid=xxx;dfid=xxx;webgl=xxx;webdriver=0;ts=xxx;data=xxx
 * 5. AES-128-CBC 加密明文 → EDT（Base64）
 * 6. RSA-OAEP SHA-256 加密 AES 密钥 → SID（Base64）
 *
 * @param mid 设备 MID 标识，不存在时默认 0
 * @param userid 用户 ID，不存在时默认 0
 * @param dfid 设备指纹 ID，不存在时默认 0
 * @param webglHash WebGL 指纹哈希，不传时自动生成
 * @returns { edt, sid }
 */
const generateSimulate = (
  mid: string | number,
  userid: string | number,
  dfid: string | number,
  webglHash?: string,
): SimulateResult => {
  // 每次调用重新生成哨兵值，增加指纹随机性
  SENTINEL = 0xffffffff - Math.floor(Math.random() * 20);

  // 生成随机 AES-128 密钥：先生成 16 字节随机字符串，取其 MD5 哈希的前 16 字符
  const key = MD5(randomString(16)).toString(Hex).substring(0, 16);

  // 随机化鼠标轨迹参数，使每次请求的行为指纹不同
  const points = ri(30, 60);   // 鼠标轨迹采样点数（30~60 个点）
  const startX = ri(200, 600); // 鼠标起点 X（页面中部区域）
  const startY = ri(200, 500); // 鼠标起点 Y
  const endX = ri(500, 700);   // 鼠标终点 X（登录按钮附近）
  const endY = ri(80, 150);    // 鼠标终点 Y

  // 参数默认值处理
  mid = mid || 0;
  userid = userid || 0;
  dfid = dfid || 0;
  webglHash = webglHash || generateWebGLHash();
  const ts = Date.now(); // 当前时间戳

  // 生成行为数据（鼠标轨迹 + 滚动 + 窗口事件）
  const data = generateEDTData({ startX, startY, endX, endY, mousePoints: points });

  // 拼接完整明文
  const sidPlaintext = `mid=${mid};userid=${userid};dfid=${dfid};webgl=${webglHash};webdriver=0;ts=${ts};data=${data}`;

  // 第1步: AES-128-CBC 加密行为指纹明文 → EDT
  const edtData = AES.encrypt(sidPlaintext, Utf8.parse(key), {
    iv: Utf8.parse(iv),
    mode: CBC,
    padding: Pkcs7,
  }).toString();

  // 第2步: RSA-OAEP SHA-256 加密 AES 密钥 → SID
  const rsaKey = forge.pki.publicKeyFromPem(publicKey) as forge.pki.rsa.PublicKey;

  const encrypted = rsaKey.encrypt(key, 'RSA-OAEP', {
    md: forge.md.sha256.create(),           // 主哈希算法
    mgf1: { md: forge.md.sha256.create() }, // MGF1 掩码生成函数的哈希算法
  });
  const ciphertext = forge.util.encode64(encrypted); // Base64 编码

  return { edt: edtData, sid: ciphertext };
};

export { generateSimulate };
