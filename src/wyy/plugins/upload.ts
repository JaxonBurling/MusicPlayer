/**
 * @fileoverview 图片上传插件
 * @module plugins/upload
 */

import axios from 'axios';
import createOption from '../util/option';
import { getUploadData } from '../util/fileHelper';
import type { WyyQuery, WyyRequest } from '../util/types';

/**
 * 上传图片到网易云 NOS，返回可用的 imgId
 * @param query 查询参数（需包含 imgFile）
 * @param request 请求函数
 */
const uploadPlugin = async (query: WyyQuery, request: WyyRequest) => {
  const data = {
    bucket: 'yyimgs',
    ext: 'jpg',
    filename: query.imgFile.name,
    local: false,
    nos_product: 0,
    return_body: `{"code":200,"size":"$(ObjectSize)"}`,
    type: 'other',
  };
  const res = await request(
    `/api/nos/token/alloc`,
    data,
    createOption(query, 'weapi'),
  );

  await axios({
    method: 'post',
    url: `https://nosup-hz1.127.net/yyimgs/${res.body.result.objectKey}?offset=0&complete=true&version=1.0`,
    headers: {
      'x-nos-token': res.body.result.token,
      'Content-Type': query.imgFile.mimetype || 'image/jpeg',
    },
    data: getUploadData(query.imgFile),
  });

  return {
    url_pre: 'https://p1.music.126.net/' + res.body.result.objectKey,
    imgId: res.body.result.docId,
  };
};

export default uploadPlugin;
