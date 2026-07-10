<script setup lang="ts">
/**
 * 主页
 * - 已登录：展示平台歌单、平台收藏歌曲、本地收藏
 * - 未登录：展示本地收藏 + 登录引导
 */
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../state'
import { VideoPlay, Plus, User } from '@element-plus/icons-vue'
import { getPlaylistSongs } from '../api/index'
import type { Song, Playlist } from '../api/index'

const store = useAppStore()
const router = useRouter()

onMounted(() => {
  if (store.isLoggedIn()) store.loadUserPlatformData()
})

// 切换音源时重新加载平台数据
watch(() => store.source, () => {
  if (store.isLoggedIn()) store.loadUserPlatformData()
})

function playFavorite(_song: Song, index: number) {
  store.playList([...store.favorites], index)
}

async function playPlaylist(pl: Playlist) {
  const songs = await getPlaylistSongs(store.source, pl.id)
  if (songs.length > 0) {
    store.playList(songs)
  }
}

function playLiked(index: number) {
  store.playList([...store.userLikedSongs], index)
}

function goLogin() { router.push('/login') }
</script>

<template>
  <div class="main-page" v-loading="store.homeLoading">
    <!-- 已登录：平台歌单 -->
    <section v-if="store.isLoggedIn() && store.userPlaylists.length > 0" class="section">
      <div class="section-header">
        <h2>{{ store.source === 'kugou' ? '酷狗' : '网易云' }}歌单</h2>
        <span class="count">{{ store.userPlaylists.length }} 个</span>
      </div>
      <div class="playlist-scroll">
        <div
          v-for="pl in store.userPlaylists"
          :key="pl.id"
          class="pl-card"
          @click="playPlaylist(pl)"
        >
          <div class="pl-cover">
            <el-image v-if="pl.coverUrl" :src="pl.coverUrl" fit="cover" />
            <el-icon v-else :size="32" color="var(--el-text-color-placeholder)"><VideoPlay /></el-icon>
            <div class="pl-overlay">
              <el-button circle :icon="VideoPlay" size="small" class="overlay-btn" />
            </div>
          </div>
          <span class="pl-title">{{ pl.name }}</span>
          <span class="pl-count">{{ pl.trackCount }} 首</span>
        </div>
      </div>
    </section>

    <!-- 未登录提示 -->
    <section v-if="!store.isLoggedIn()" class="section">
      <div class="login-hint" @click="goLogin">
        <el-icon :size="48" color="var(--el-color-primary)"><User /></el-icon>
        <p>登录{{ store.source === 'kugou' ? '酷狗' : '网易云' }}账号</p>
        <p class="sub">同步平台歌单与收藏</p>
      </div>
    </section>

    <!-- 已登录：平台收藏歌曲 -->
    <section v-if="store.isLoggedIn() && store.userLikedSongs.length > 0" class="section">
      <div class="section-header">
        <h2>{{ store.source === 'kugou' ? '听歌排行' : '我喜欢的音乐' }}</h2>
        <span class="count">{{ store.userLikedSongs.length }} 首</span>
      </div>
      <div class="song-grid">
        <div
          v-for="(song, idx) in store.userLikedSongs"
          :key="song.hash || song.id"
          class="song-card"
          @dblclick="playLiked(idx)"
        >
          <div class="card-cover">
            <el-image v-if="song.pic" :src="song.pic" fit="cover" />
            <el-icon v-else :size="36" color="var(--el-text-color-placeholder)"><VideoPlay /></el-icon>
            <div class="card-play-overlay">
              <el-button circle :icon="VideoPlay" size="large" class="overlay-btn" @click.stop="playLiked(idx)" />
            </div>
          </div>
          <div class="card-info">
            <span class="card-name">{{ song.name }}</span>
            <span class="card-artist">{{ song.artist }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 本地收藏 -->
    <section class="section">
      <div class="section-header">
        <h2>我的收藏</h2>
        <span class="count">{{ store.favorites.length }} 首</span>
      </div>
      <div v-if="store.favorites.length === 0" class="empty-state">
        <el-icon :size="48" color="var(--el-text-color-placeholder)"><Plus /></el-icon>
        <p>还没有收藏歌曲，去搜索页面添加吧</p>
      </div>
      <div v-else class="song-grid">
        <div
          v-for="(song, idx) in store.favorites"
          :key="song.hash || song.id"
          class="song-card"
          @dblclick="playFavorite(song, idx)"
        >
          <div class="card-cover">
            <el-image v-if="song.pic" :src="song.pic" fit="cover" />
            <el-icon v-else :size="36" color="var(--el-text-color-placeholder)"><VideoPlay /></el-icon>
            <div class="card-play-overlay">
              <el-button circle :icon="VideoPlay" size="large" class="overlay-btn" @click.stop="playFavorite(song, idx)" />
            </div>
          </div>
          <div class="card-info">
            <span class="card-name">{{ song.name }}</span>
            <span class="card-artist">{{ song.artist }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 当前播放列表 -->
    <section v-if="store.playlist.length > 0" class="section">
      <div class="section-header">
        <h2>播放列表</h2>
        <span class="count">{{ store.playlist.length }} 首</span>
      </div>
      <div class="playlist-mini">
        <div
          v-for="(song, idx) in store.playlist"
          :key="idx"
          class="mini-item"
          :class="{ active: idx === store.playlistIndex }"
          @dblclick="store.playFromList(idx)"
        >
          <span class="mini-idx">{{ idx + 1 }}</span>
          <span class="mini-name">{{ song.name }}</span>
          <span class="mini-artist">{{ song.artist }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.main-page { max-width: 1200px; margin: 0 auto; padding: 10px 0 80px; }
.section { margin-bottom: 32px; }
.section-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px; }
.section-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.count { font-size: 13px; color: var(--el-text-color-secondary); }

/* 登录引导 */
.login-hint {
  display: flex; flex-direction: column; align-items: center; padding: 40px 0;
  border: 2px dashed var(--el-border-color); border-radius: 12px;
  cursor: pointer; transition: border-color 0.2s; gap: 8px;
}
.login-hint:hover { border-color: var(--el-color-primary); }
.login-hint p { margin: 0; font-size: 15px; font-weight: 500; }
.login-hint .sub { font-size: 13px; color: var(--el-text-color-secondary); font-weight: 400; }

/* 歌单横向滚动 */
.playlist-scroll { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; }
.playlist-scroll::-webkit-scrollbar { height: 4px; }
.playlist-scroll::-webkit-scrollbar-thumb { background: var(--el-border-color); border-radius: 2px; }
.pl-card { flex-shrink: 0; width: 160px; cursor: pointer; border-radius: 8px; transition: background 0.2s; }
.pl-card:hover { background: var(--el-fill-color-light); }
.pl-cover {
  position: relative; width: 160px; height: 160px; border-radius: 8px;
  overflow: hidden; background: var(--el-fill-color-light);
  display: flex; align-items: center; justify-content: center;
}
.pl-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  opacity: 0; background: rgba(0,0,0,0.3); transition: opacity 0.2s;
}
.pl-card:hover .pl-overlay { opacity: 1; }
.pl-title { display: block; padding: 8px 4px 2px; font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pl-count { display: block; padding: 0 4px; font-size: 11px; color: var(--el-text-color-secondary); }

/* 收藏/歌曲网格 */
.song-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.song-card { cursor: pointer; border-radius: 8px; overflow: hidden; transition: background 0.2s; }
.song-card:hover { background: var(--el-fill-color-light); }
.card-cover {
  position: relative; width: 100%; aspect-ratio: 1; border-radius: 8px;
  overflow: hidden; background: var(--el-fill-color-light);
  display: flex; align-items: center; justify-content: center;
}
.card-play-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  opacity: 0; background: rgba(0,0,0,0.3); transition: opacity 0.2s;
}
.song-card:hover .card-play-overlay { opacity: 1; }
.overlay-btn { transform: translateY(8px); transition: transform 0.2s; }
.song-card:hover .overlay-btn, .pl-card:hover .overlay-btn { transform: translateY(0); }
.card-info { padding: 8px 4px; display: flex; flex-direction: column; overflow: hidden; }
.card-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-artist { font-size: 12px; color: var(--el-text-color-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px 0; color: var(--el-text-color-placeholder); gap: 12px; }
.empty-state p { margin: 0; font-size: 14px; }

/* 播放列表迷你 */
.playlist-mini { border-radius: 8px; overflow: hidden; border: 1px solid var(--el-border-color-light); }
.mini-item { display: flex; align-items: center; gap: 12px; padding: 8px 16px; cursor: pointer; transition: background 0.15s; }
.mini-item:hover { background: var(--el-fill-color-light); }
.mini-item.active { color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.mini-item:nth-child(odd) { background: var(--el-fill-color-lighter); }
.mini-item:nth-child(odd):hover { background: var(--el-fill-color-light); }
.mini-idx { width: 24px; text-align: center; font-size: 13px; color: var(--el-text-color-secondary); flex-shrink: 0; }
.mini-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.mini-artist { font-size: 12px; color: var(--el-text-color-secondary); width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
</style>
