import type { WyyQuery, WyyRequest } from '../util/types';

// 歌单导入 - 任务状态
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  return request(
    `/api/playlist/import/task/status/v2`,
    {
      taskIds: JSON.stringify([query.id]),
    },
    createOption(query),
  )
}
