<script setup lang="ts">
/**
 * 歌单列表页
 * - 由首页歌单卡片跳转进入，query 携带歌单 id / 音源 / 名称 / 封面
 * - 依次展示序号、专辑封面、歌名、歌手、专辑、时长
 * - 双击歌曲直接播放；右侧提供 播放 / 本地收藏 / 添加到歌单 三个按钮
 * - 歌单详情由 API 层缓存，离线时使用上一次的数据
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { VideoPlay, Star, StarFilled, FolderAdd, Back, Right } from '@element-plus/icons-vue'
import { useAppStore } from '../state'
import { getPlaylistSongs, addSongToPlaylist } from '../api/index'
import type { Song, Playlist } from '../api/index'

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const songs = ref<Song[]>([])
const loading = ref(false)
const addVisible = ref(false)
const addTarget = ref<Song | null>(null)

let loadToken = 0

// 歌单基础信息从路由 query 读取（首页跳转时已带上）
const playlistId = computed(() => String(route.query.id || ''))
const source = computed<'kugou' | 'netease'>(() => (route.query.source === 'kugou' ? 'kugou' : 'netease'))
const title = computed(() => String(route.query.name || '歌单'))
const cover = computed(() => String(route.query.cover || ''))
const trackCount = computed(() => Number(route.query.count) || 0)

/** 可添加到的平台歌单（音源需与歌曲一致） */
const addablePlaylists = computed<Playlist[]>(() => {
  const song = addTarget.value
  if (!song) return []
  return store.userPlaylists.filter((pl) => pl.source === song.source)
})

/** 加载歌单歌曲；缓存命中时无需等待网络 */
async function loadSongs() {
  const id = playlistId.value
  if (!id) {
    songs.value = []
    loading.value = false
    return
  }

  const token = ++loadToken
  loading.value = true
  const result = await getPlaylistSongs(source.value, id)
  if (token !== loadToken) return // 已切换到其他歌单
  songs.value = result
  loading.value = false
}

onMounted(loadSongs)
watch(() => [route.query.id, route.query.source], loadSongs)

/** 当前播放行高亮 */
function isCurrent(song: Song): boolean {
  const current = store.currentSong
  if (!current || current.source !== song.source) return false
  return song.source === 'kugou' ? current.hash === song.hash : current.id === song.id
}

function rowClassName({ row }: { row: Song }): string {
  return isCurrent(row) ? 'playing-row' : ''
}

function playAll() {
  if (songs.value.length > 0) store.playList([...songs.value], 0)
}

function onPlay(song: Song) {
  const index = songs.value.indexOf(song)
  store.playList([...songs.value], Math.max(index, 0))
}

function onDblClick(song: Song) {
  onPlay(song)
}

function onFav(song: Song) {
  store.toggleFavorite(song)
  ElMessage.success(store.isFavorite(song) ? '已加入本地收藏' : '已取消收藏')
}

function openAdd(song: Song) {
  addTarget.value = song
  addVisible.value = true
  // 尚未加载平台歌单时补一次（有缓存会立即返回）
  if (store.isLoggedIn() && store.userPlaylists.length === 0) void store.loadUserPlatformData()
}

/** 添加到当前播放列表 / 下一首播放 */
function addToQueue(next: boolean) {
  const song = addTarget.value
  if (!song) return
  if (next) {
    store.playNext(song)
    ElMessage.success('已设为下一首播放')
  } else {
    store.addToList([song])
    ElMessage.success('已添加到播放列表')
  }
  addVisible.value = false
}

/** 添加到平台歌单（网易云支持官方接口，酷狗暂不支持） */
async function addToPlatform(playlist: Playlist) {
  const song = addTarget.value
  if (!song) return
  const ok = await addSongToPlaylist(playlist, song)
  if (ok) {
    playlist.trackCount += 1
    ElMessage.success(`已添加到「${playlist.name}」`)
    addVisible.value = false
  } else {
    ElMessage.warning('添加失败，请检查网络或登录状态')
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return '--:--'
  if (source.value === "kugou") {
    seconds /=  1000
  }
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}
</script>

<template>
  <div class="songlist-page">
    <!-- 歌单信息 -->
    <div class="playlist-head">
      <el-button text round :icon="Back" style="margin-bottom: 5px;margin-top: -20px;" @click="goBack">返回</el-button>

      <div class="head-main">
        <div class="head-cover">
          <el-image v-if="cover" :src="cover" fit="cover" />
          <el-icon v-else :size="36" color="var(--el-text-color-placeholder)"><VideoPlay /></el-icon>
        </div>

        <div class="head-info">
          <div class="head-title-row">
            <h2>{{ title }}</h2>
            <el-tag size="small" :type="source === 'kugou' ? 'warning' : 'danger'" effect="plain">
              {{ source === 'kugou' ? '酷狗' : '网易云' }}
            </el-tag>
          </div>
          <p class="head-sub">{{ songs.length || trackCount }} 首歌曲 · 双击歌曲即可播放</p>
          <div class="head-actions">
            <el-button type="primary" :icon="VideoPlay" :disabled="songs.length === 0" @click="playAll">
              播放全部
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 歌曲列表 -->
    <div class="song-table" v-loading="loading" element-loading-text="正在加载歌单...">
      <el-table
        stripe
        :data="songs"
        :row-class-name="rowClassName"
        @row-dblclick="onDblClick"
      >
        <el-table-column type="index" label="#" width="54" align="center" />

        <el-table-column width="64" align="center">
          <template #default="{ row }">
            <el-image v-if="row.pic" :src="row.pic" class="row-cover" fit="cover" lazy />
            <span v-else class="row-cover row-cover-empty">
              <el-icon :size="16"><VideoPlay /></el-icon>
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="歌曲" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="song-name-cell" :class="{ active: isCurrent(row) }">
              <el-icon v-if="isCurrent(row) && store.isPlaying" :size="13" class="playing-icon">
                <VideoPlay />
              </el-icon>
              {{ row.name }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="artist" label="歌手" min-width="130" show-overflow-tooltip />

        <el-table-column prop="album" label="专辑" width="180" show-overflow-tooltip />

        <el-table-column prop="duration" label="时长" width="76" align="center">
          <template #default="{ row }">
            <span class="duration-text">{{ formatDuration(row.duration) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="122" align="center">
          <template #default="{ row }">
            <div class="col-actions" @dblclick.stop>
              <el-tooltip content="播放" placement="top">
                <el-button text circle :icon="VideoPlay" @click.stop="onPlay(row)" />
              </el-tooltip>

              <el-tooltip :content="store.isFavorite(row) ? '取消本地收藏' : '本地收藏'" placement="top">
                <el-button
                  text
                  circle
                  @click.stop="onFav(row)"
                  :style="{ color: store.isFavorite(row) ? 'var(--el-color-warning)' : '' }"
                >
                  <el-icon :size="16">
                    <StarFilled v-if="store.isFavorite(row)" />
                    <Star v-else />
                  </el-icon>
                </el-button>
              </el-tooltip>

              <el-tooltip content="添加到歌单" placement="top">
                <el-button text circle :icon="FolderAdd" @click.stop="openAdd(row)" />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <template #empty>
          <div v-if="!loading" class="empty-state">
            <el-icon :size="48" color="var(--el-text-color-placeholder)"><VideoPlay /></el-icon>
            <p>{{ playlistId ? '歌单暂无歌曲，或当前离线且还没有缓存' : '请从首页选择要查看的歌单' }}</p>
            <el-button text type="primary" @click="goBack">返回首页</el-button>
          </div>
        </template>
      </el-table>
    </div>

    <!-- 添加到歌单 -->
    <el-dialog v-model="addVisible" title="添加到歌单" width="420px" append-to-body>
      <div v-if="addTarget" class="add-song">
        <el-image v-if="addTarget.pic" :src="addTarget.pic" class="add-song-cover" fit="cover" />
        <span v-else class="add-song-cover add-song-cover-empty">
          <el-icon :size="20"><VideoPlay /></el-icon>
        </span>
        <div class="add-song-info">
          <span class="add-song-name">{{ addTarget.name }}</span>
          <span class="add-song-artist">{{ addTarget.artist || '未知歌手' }}</span>
        </div>
      </div>

      <div class="add-section">
        <p class="add-label">当前播放列表</p>
        <div class="add-queue-actions">
          <el-button :icon="FolderAdd" @click="addToQueue(false)">添加到播放列表</el-button>
          <el-button :icon="Right" @click="addToQueue(true)">下一首播放</el-button>
        </div>
      </div>

      <div class="add-section">
        <p class="add-label">平台歌单</p>

        <div v-if="addTarget?.source === 'kugou'" class="add-tip">
          酷狗暂不支持在线添加歌曲，可先添加到播放列表
        </div>
        <div v-else-if="!store.isLoggedIn()" class="add-tip">
          登录网易云后可将歌曲添加到自己的歌单
        </div>
        <div v-else-if="addablePlaylists.length === 0" class="add-tip">
          {{ store.homeLoading ? '正在加载歌单...' : '暂无可用歌单' }}
        </div>
        <el-scrollbar v-else max-height="220px">
          <div
            v-for="pl in addablePlaylists"
            :key="pl.id"
            class="add-pl-item"
            @click="addToPlatform(pl)"
          >
            <el-image v-if="pl.coverUrl" :src="pl.coverUrl" class="add-pl-cover" fit="cover" />
            <span v-else class="add-pl-cover add-pl-cover-empty">
              <el-icon :size="14"><VideoPlay /></el-icon>
            </span>
            <span class="add-pl-name">{{ pl.name }}</span>
            <span class="add-pl-count">{{ pl.trackCount }} 首</span>
          </div>
        </el-scrollbar>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.songlist-page { max-width: 1000px; margin: 0 auto; padding: 6px 0 90px; }

/* 歌单头部 */
.playlist-head { margin-bottom: 18px; }
.head-main { display: flex; align-items: center; gap: 18px; }
.head-cover {
  width: 96px; height: 96px; border-radius: 12px; overflow: hidden; flex-shrink: 0;
  background: var(--el-fill-color-light);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.head-cover :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.head-info { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.head-title-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
.head-title-row h2 { margin: 0; font-size: 22px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.head-sub { margin: 0; font-size: 13px; color: var(--el-text-color-secondary); }
.head-actions { margin-top: 4px; }

/* 歌曲表格 */
.song-table {
  position: relative;
  min-height: 180px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  overflow: hidden;
}
.song-table :deep(.el-table) {
  --el-table-border-color: transparent;
  --el-table-header-bg-color: var(--el-fill-color-light);
  --el-table-row-hover-bg-color: var(--el-fill-color-light);
  background: transparent;
}
.song-table :deep(.el-table__header th) {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  height: 42px;
}
.song-table :deep(.el-table__row) { cursor: pointer; }
.song-table :deep(.playing-row > td) {
  background: var(--el-color-primary-light-9) !important;
}
.song-table :deep(.song-name-cell) { font-weight: 500; }
.song-table :deep(.song-name-cell.active) { color: var(--el-color-primary); }
.song-table :deep(.playing-icon) { margin-right: 5px; vertical-align: -1px; }
.song-table :deep(.duration-text) {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.col-actions { display: flex; justify-content: center; margin: 0; }
.col-actions button { margin: 0; }
.row-cover { width: 34px; height: 34px; border-radius: 6px; flex-shrink: 0; }
.row-cover-empty {
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--el-fill-color-light); color: var(--el-text-color-placeholder);
}

/* 空状态 */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 70px 0; color: var(--el-text-color-placeholder);
}
.empty-state p { margin: 0; font-size: 14px; }

/* 添加到歌单弹窗 */
.add-song { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--el-border-color-lighter); }
.add-song-cover { width: 44px; height: 44px; border-radius: 6px; flex-shrink: 0; }
.add-song-cover-empty { display: flex; align-items: center; justify-content: center; background: var(--el-fill-color-light); color: var(--el-text-color-placeholder); }
.add-song-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.add-song-name { font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.add-song-artist { font-size: 12px; color: var(--el-text-color-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.add-section { margin-top: 16px; }
.add-label { margin: 0 0 8px; font-size: 12px; font-weight: 500; color: var(--el-text-color-secondary); }
.add-queue-actions { display: flex; gap: 8px; }

.add-tip { font-size: 13px; color: var(--el-text-color-secondary); padding: 6px 0; }
.add-pl-item {
  display: flex; align-items: center; gap: 10px; padding: 6px 8px;
  border-radius: 6px; cursor: pointer; transition: background 0.15s;
}
.add-pl-item:hover { background: var(--el-fill-color-light); }
.add-pl-cover { width: 34px; height: 34px; border-radius: 5px; flex-shrink: 0; }
.add-pl-cover-empty { display: flex; align-items: center; justify-content: center; background: var(--el-fill-color-light); color: var(--el-text-color-placeholder); }
.add-pl-name { flex: 1; min-width: 0; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.add-pl-count { font-size: 12px; color: var(--el-text-color-secondary); flex-shrink: 0; }

@media (max-width: 720px) {
  .head-cover { width: 72px; height: 72px; }
  .head-title-row h2 { font-size: 18px; }
}
</style>
