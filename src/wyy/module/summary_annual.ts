import type { WyyQuery, WyyRequest } from '../util/types';

// 年度听歌报告2017-2023
import createOption from '../util/option';
export default (query: WyyQuery, request: WyyRequest) => {
  const data = {}
  const key =
    ['2017', '2018', '2019'].indexOf(query.year) > -1 ? 'userdata' : 'data'
  return request(
    `/api/activity/summary/annual/${query.year}/${key}`,
    data,
    createOption(query),
  )
}
