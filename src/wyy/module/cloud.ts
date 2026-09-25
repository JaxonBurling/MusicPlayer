import type { WyyQuery, WyyRequest } from '../util/types';

import songUploadPlugin from '../plugins/songUpload';
import createOption from '../util/option';
import logger from '../util/logger';
import * as mm from 'music-metadata';
import {
  isTempFile,
  getFileSize,
  getFileMd5,
  cleanupTempFile,
  getFileExtension,
  sanitizeFilename,
} from '../util/fileHelper';

export default async (query: WyyQuery, request: WyyRequest) => {
  query.songFile.name = Buffer.from(query.songFile.name, 'latin1').toString(
    'utf-8',
  );
  const ext = getFileExtension(query.songFile.name);
  const filename = sanitizeFilename(query.songFile.name);
  const bitrate = 999000;

  if (!query.songFile) {
    return Promise.reject({
      status: 500,
      body: {
        msg: '请上传音乐文件',
        code: 500,
      },
    });
  }

  const useTemp = isTempFile(query.songFile);
  const fileSize = await getFileSize(query.songFile);
  const fileMd5 = await getFileMd5(query.songFile);

  query.songFile.md5 = fileMd5;
  query.songFile.size = fileSize;

  try {
    const res = await request(
      `/api/cloud/upload/check`,
      {
        bitrate: String(bitrate),
        ext: '',
        length: fileSize,
        md5: fileMd5,
        songId: '0',
        version: 1,
      },
      createOption(query),
    );

    let artist = '';
    let album = '';
    let songName = '';

    try {
      let metadata;
      if (useTemp) {
        metadata = await mm.parseFile(query.songFile.tempFilePath);
      } else {
        metadata = await mm.parseBuffer(
          query.songFile.data,
          query.songFile.mimetype,
        );
      }
      const info = metadata.common;
      if (info.title) songName = info.title;
      if (info.album) album = info.album;
      if (info.artist) artist = info.artist;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.info('元数据解析错误:', message);
    }

    const tokenRes = await request(
      `/api/nos/token/alloc`,
      {
        bucket: '',
        ext: ext,
        filename: filename,
        local: false,
        nos_product: 3,
        type: 'audio',
        md5: fileMd5,
      },
      createOption(query),
    );

    if (!tokenRes.body.result || !tokenRes.body.result.resourceId) {
      logger.error('Token分配失败:', tokenRes.body);
      return Promise.reject({
        status: 500,
        body: {
          code: 500,
          msg: '获取上传token失败',
          detail: tokenRes.body,
        },
      });
    }

    if (res.body.needUpload) {
      logger.info('需要上传，开始上传流程...');
      try {
        const uploadInfo = await songUploadPlugin(query, request);
        logger.info('上传完成:', uploadInfo?.body?.result?.resourceId);
      } catch (uploadError) {
        logger.error('上传失败:', uploadError);
        return Promise.reject(uploadError);
      }
    } else {
      logger.info('文件已存在，跳过上传');
    }

    const res2 = await request(
      `/api/upload/cloud/info/v2`,
      {
        md5: fileMd5,
        songid: res.body.songId,
        filename: query.songFile.name,
        song: songName || filename,
        album: album || '未知专辑',
        artist: artist || '未知艺术家',
        bitrate: String(bitrate),
        resourceId: tokenRes.body.result.resourceId,
      },
      createOption(query),
    );

    if (res2.body.code !== 200) {
      logger.error('云盘信息上传失败:', res2.body);
      return Promise.reject({
        status: res2.status || 500,
        body: {
          code: res2.body.code || 500,
          msg: res2.body.msg || '上传云盘信息失败',
          detail: res2.body,
        },
      });
    }

    const res3 = await request(
      `/api/cloud/pub/v2`,
      {
        songid: res2.body.songId,
      },
      createOption(query),
    );

    return {
      status: 200,
      body: {
        ...res.body,
        ...res3.body,
      },
      cookie: res.cookie,
    };
  } finally {
    if (useTemp) {
      await cleanupTempFile(query.songFile.tempFilePath);
    }
  }
};
