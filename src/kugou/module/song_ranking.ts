import type { KugouParams, UseAxios } from '../util/types';

// 歌曲成绩单

export default (params: KugouParams, useAxios: UseAxios) => {

  return useAxios({
    url: '/grow/v1/song_ranking/play_page/ranking_info',
    method: 'GET',
    params: { album_audio_id: params.album_audio_id },
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
