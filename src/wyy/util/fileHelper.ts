/**
 * @fileoverview 文件处理辅助函数
 * @module util/fileHelper
 */

import fs from 'fs';
import crypto from 'crypto';
import logger from './logger';

/** 上传文件描述 */
interface UploadFile {
  tempFilePath?: string;
  data?: Buffer;
  size?: number;
  md5?: string;
  [key: string]: any;
}

/** 是否为临时文件 */
function isTempFile(file: UploadFile | undefined): boolean {
  return !!(file && file.tempFilePath);
}

/** 获取文件大小 */
async function getFileSize(file: UploadFile): Promise<number> {
  if (isTempFile(file)) {
    const stats = await fs.promises.stat(file.tempFilePath!);
    return stats.size;
  }
  return file.data ? file.data.byteLength : file.size || 0;
}

/** 获取文件 MD5 */
async function getFileMd5(file: UploadFile): Promise<string> {
  if (file.md5) {
    return file.md5;
  }

  if (isTempFile(file)) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(file.tempFilePath!);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  if (file.data) {
    return crypto.createHash('md5').update(file.data).digest('hex');
  }

  throw new Error('无法计算文件MD5: 缺少文件数据');
}

/** 获取上传数据 */
function getUploadData(file: UploadFile): fs.ReadStream | Buffer | undefined {
  if (isTempFile(file)) {
    return fs.createReadStream(file.tempFilePath!);
  }
  return file.data;
}

/** 清理临时文件 */
async function cleanupTempFile(filePath?: string): Promise<void> {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.info('临时文件清理失败:', message);
  }
}

/** 读取文件分片 */
async function readFileChunk(
  filePath: string,
  offset: number,
  length: number,
): Promise<Buffer> {
  const fd = await fs.promises.open(filePath, 'r');
  const buffer = Buffer.alloc(length);
  await fd.read(buffer, 0, length, offset);
  await fd.close();
  return buffer;
}

/** 获取文件扩展名 */
function getFileExtension(filename?: string): string {
  if (!filename) return 'mp3';
  if (filename.includes('.')) {
    return filename.split('.').pop()!.toLowerCase();
  }
  return 'mp3';
}

/** 规范化文件名 */
function sanitizeFilename(filename?: string): string {
  if (!filename) return 'unknown';
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/\s/g, '')
    .replace(/\./g, '_');
}

export {
  isTempFile,
  getFileSize,
  getFileMd5,
  getUploadData,
  cleanupTempFile,
  readFileChunk,
  getFileExtension,
  sanitizeFilename,
};
