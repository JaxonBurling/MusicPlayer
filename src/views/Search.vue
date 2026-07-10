<script setup lang="ts">
/**
 * 搜索页面
 * - 搜索结果列表：歌名 / 歌手 / 专辑 + 播放/下一首播放/收藏按钮
 * - 单击行 → 右侧抽屉展示歌曲详情
 * - 双击行 → 直接播放
 * - 关键词由 header 搜索框通过路由 query 传入
 */
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { VideoPlay, Plus, Star, StarFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '../state'
import { searchSongs } from '../api/index'
import type { Song } from '../api/index'

const store = useAppStore()
const route = useRoute()

const keyword = ref('')
const results = ref<Song[]>([])
const loading = ref(false)
const hasSearched = ref(false)
const page = ref(1)

const drawerVisible = ref(false)
const detailSong = ref<Song | null>(null)

/** 执行搜索 */
async function doSearch(isNew = true) {
  const kw = keyword.value.trim()
  if (!kw) return

  if (isNew) {
    page.value = 1
    results.value = []
  }

  loading.value = true
  hasSearched.value = true

  try {
    const songs = await searchSongs({
      keywords: kw,
      page: page.value,
      limit: 30,
      source: store.source,
    })
    results.value = songs
  } catch (e) {
    console.error('搜索失败:', e)
    results.value = []
  } finally {
    loading.value = false
  }
}

function onDblClick(song: Song) {
  store.playList(results.value, results.value.indexOf(song))
}

function onClick(song: Song) {
  detailSong.value = song
  drawerVisible.value = true
}

function onPlay(song: Song) {
  store.playList(results.value, results.value.indexOf(song))
}

function onNextPlay(song: Song) {
  store.playNext(song)
  if (!store.showPlayer) store.showPlayer = true
  ElMessage.success(`已添加「${song.name}」为下一首播放`)
}

function onFav(song: Song) {
  store.toggleFavorite(song)
  ElMessage(store.isFavorite(song) ? '已收藏' : '已取消收藏')
}

// 从路由 query 获取关键词
const queryKw = route.query.q as string
if (queryKw) {
  keyword.value = queryKw
  doSearch(true)
}

watch(() => route.query.q, (val) => {
  if (val && typeof val === 'string') {
    keyword.value = val
    doSearch(true)
  }
})
</script>

<template>
  <div class="search-page">
    <div class="search-results" v-loading="loading">
      <div v-if="!hasSearched && !loading" class="empty-hint">
        <el-icon :size="48" color="var(--el-text-color-placeholder)"><i class="el-icon-search" /></el-icon>
        <p>在上方搜索框中输入关键词并按回车搜索</p>
      </div>

      <div v-else-if="results.length === 0 && !loading" class="empty-hint">
        <p>未找到相关歌曲</p>
      </div>

      <div v-else class="song-list">
        <div class="list-header">
          <span class="col-name">歌曲</span>
          <span class="col-artist">歌手</span>
          <span class="col-album">专辑</span>
          <span class="col-actions">操作</span>
        </div>

        <div
          v-for="(song, idx) in results"
          :key="song.hash || song.id || idx"
          class="song-row"
          @click="onClick(song)"
          @dblclick="onDblClick(song)"
        >
          <div class="col-name">
            <el-image v-if="song.pic" :src="song.pic" class="row-cover" fit="cover" />
            <span v-else class="row-idx">{{ idx + 1 }}</span>
            <span class="row-title">{{ song.name }}</span>
          </div>

          <span class="col-artist">{{ song.artist }}</span>
          <span class="col-album">{{ song.album }}</span>

          <div class="col-actions">
            <el-tooltip content="播放" placement="top">
              <el-button text circle :icon="VideoPlay" @click.stop="onPlay(song)" />
            </el-tooltip>

            <el-tooltip content="下一首播放" placement="top">
              <el-button text circle :icon="Plus" @click.stop="onNextPlay(song)" />
            </el-tooltip>

            <el-tooltip :content="store.isFavorite(song) ? '取消收藏' : '收藏'" placement="top">
              <el-button
                text
                circle
                @click.stop="onFav(song)"
                :style="{ color: store.isFavorite(song) ? 'var(--el-color-warning)' : '' }"
              >
                <el-icon :size="16">
                  <StarFilled v-if="store.isFavorite(song)" />
                  <Star v-else />
                </el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer v-model="drawerVisible" title="歌曲详情" direction="rtl" size="380px">
      <template v-if="detailSong">
        <div class="detail-content">
          <div class="detail-cover">
            <el-image v-if="detailSong.pic" :src="detailSong.pic" fit="cover" class="detail-img" />
            <el-icon v-else :size="80" color="var(--el-text-color-placeholder)"><VideoPlay /></el-icon>
          </div>
          <div class="detail-info">
            <h3>{{ detailSong.name }}</h3>
            <p><span class="label">歌手：</span>{{ detailSong.artist }}</p>
            <p><span class="label">专辑：</span>{{ detailSong.album }}</p>
            <p v-if="detailSong.duration">
              <span class="label">时长：</span>{{ Math.floor(detailSong.duration / 60) }}:{{ String(Math.floor(detailSong.duration % 60)).padStart(2, '0') }}
            </p>
            <p><span class="label">来源：</span>{{ detailSong.source === 'kugou' ? '酷狗音乐' : '网易云音乐' }}</p>
          </div>
          <div class="detail-actions">
            <el-button type="primary" :icon="VideoPlay" @click="onPlay(detailSong!)">立即播放</el-button>
            <el-button :icon="Plus" @click="onNextPlay(detailSong!)">下一首播放</el-button>
            <el-button
              :type="store.isFavorite(detailSong) ? 'warning' : 'default'"
              @click="onFav(detailSong!)"
            >
              <el-icon style="margin-right: 4px;">
                <StarFilled v-if="store.isFavorite(detailSong)" />
                <Star v-else />
              </el-icon>
              {{ store.isFavorite(detailSong) ? '取消收藏' : '收藏' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.search-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 10px 0 80px;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
  color: var(--el-text-color-placeholder);
  gap: 12px;
}
.empty-hint p { margin: 0; font-size: 14px; }

.song-list {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
}

.list-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: var(--el-fill-color-light);
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.song-row {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 14px;
}
.song-row:hover { background: var(--el-fill-color-light); }
.song-row:nth-child(odd) { background: var(--el-fill-color-lighter); }
.song-row:nth-child(odd):hover { background: var(--el-fill-color-light); }

.col-name { flex: 2.5; display: flex; align-items: center; gap: 10px; min-width: 0; }
.col-artist { flex: 1.5; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-album { flex: 2; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--el-text-color-secondary); }
.col-actions { width: 130px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end; gap: 2px; }

.row-cover { width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0; }
.row-idx { width: 32px; text-align: center; color: var(--el-text-color-secondary); font-size: 13px; flex-shrink: 0; }
.row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }

/* 详情抽屉 */
.detail-content { display: flex; flex-direction: column; align-items: center; padding-top: 20px; }
.detail-cover {
  width: 200px; height: 200px; border-radius: 12px; overflow: hidden;
  background: var(--el-fill-color-light); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;
}
.detail-img { width: 100%; height: 100%; }
.detail-info { width: 100%; margin-bottom: 24px; }
.detail-info h3 { margin: 0 0 12px; font-size: 18px; text-align: center; }
.detail-info p { margin: 6px 0; font-size: 14px; color: var(--el-text-color-regular); }
.label { color: var(--el-text-color-secondary); font-size: 13px; }
.detail-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
</style>
