<script setup lang="ts">
/**
 * 底部音乐播放控制器
 * 常驻显示，圆角设计，不贴底 8px，右侧有播放列表按钮
 */
import { ref, watch, onMounted, computed } from 'vue'
import { VideoPause, VideoPlay, Back, Right, List } from '@element-plus/icons-vue'
import { useAppStore } from '../state'

const store = useAppStore()
const audioRef = ref<HTMLAudioElement>()

const currentTime = ref(0)
const duration = ref(0)
const progress = ref(0)

// 播放列表弹窗
const listVisible = ref(false)

const modeLabel = computed(() => {
  const map = { list: '列表循环', random: '随机播放', single: '单曲循环' }
  return map[store.playMode]
})

onMounted(() => {
  if (audioRef.value) store.setAudioElement(audioRef.value)
})

watch(() => store.audioUrl, (url) => {
  if (url && audioRef.value) {
    audioRef.value.src = url
    audioRef.value.play().catch(() => { store.isPlaying = false })
  }
})

watch(() => store.isPlaying, (playing) => {
  if (!audioRef.value) return
  if (playing) audioRef.value.play().catch(() => { store.isPlaying = false })
  else audioRef.value.pause()
})

watch(() => store.volume, (vol) => {
  if (audioRef.value) audioRef.value.volume = vol
})

function onTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
    duration.value = audioRef.value.duration || 0
    progress.value = duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
  }
}

function onEnded() { store.next() }
function onLoadedMetadata() {
  if (audioRef.value) { duration.value = audioRef.value.duration; audioRef.value.volume = store.volume }
}

function seekTo(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const pct = (e.clientX - rect.left) / rect.width
  if (audioRef.value && duration.value > 0) audioRef.value.currentTime = pct * duration.value
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function onListClick(index: number) {
  store.playFromList(index)
  listVisible.value = false
}
</script>

<template>
  <!-- 常驻播放器，圆角，居中，不贴底 -->
  <div class="player-bar">
    <audio
      ref="audioRef"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @loadedmetadata="onLoadedMetadata"
      @error="() => store.next()"
    />

    <!-- 左侧：歌曲信息 -->
    <div class="player-left">
      <el-image
        v-if="store.currentSong?.pic"
        :src="store.currentSong.pic"
        class="song-cover"
        fit="cover"
      >
        <template #error><el-icon :size="24"><VideoPlay /></el-icon></template>
      </el-image>
      <el-icon v-else :size="24" class="song-cover-placeholder"><VideoPlay /></el-icon>

      <div class="song-info">
        <span class="song-name">{{ store.currentSong?.name || '未选择歌曲' }}</span>
        <span class="song-artist">{{ store.currentSong?.artist || '双击歌曲开始播放' }}</span>
      </div>
    </div>

    <!-- 中间：播放控制 + 进度 -->
    <div class="player-center">
      <div class="player-controls">
        <el-tooltip :content="modeLabel" placement="top">
          <el-button text circle @click="store.togglePlayMode()" class="ctrl-btn">
            <el-icon :size="16"><List /></el-icon>
          </el-button>
        </el-tooltip>

        <el-button text circle @click="store.prev()" class="ctrl-btn" :disabled="store.playlist.length === 0">
          <el-icon :size="22"><Back /></el-icon>
        </el-button>

        <el-button
          :icon="store.isPlaying ? VideoPause : VideoPlay"
          circle
          class="play-btn"
          :disabled="!store.currentSong"
          @click="store.togglePlay()"
        />

        <el-button text circle @click="store.next()" class="ctrl-btn" :disabled="store.playlist.length === 0">
          <el-icon :size="22"><Right /></el-icon>
        </el-button>
      </div>

      <!-- 进度条 -->
      <div class="progress-area">
        <span class="time">{{ formatTime(currentTime) }}</span>
        <div class="progress-bar" @click="seekTo">
          <div class="progress-fill" :style="{ width: progress + '%' }" />
        </div>
        <span class="time">{{ formatTime(duration) }}</span>
      </div>
    </div>

    <!-- 右侧：音量 + 播放列表按钮 -->
    <div class="player-right">
      <!-- 播放列表 -->
      <el-popover
        v-model:visible="listVisible"
        placement="top"
        :width="320"
        trigger="click"
      >
        <template #reference>
          <el-button text circle class="ctrl-btn" :class="{ active: listVisible }">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
          </el-button>
        </template>
        <div class="playlist-popover">
          <p style="margin: 0 0 8px; font-weight: bold;">播放列表 ({{ store.playlist.length }})</p>
          <el-scrollbar max-height="280px">
            <div
              v-for="(s, i) in store.playlist"
              :key="i"
              class="pl-item"
              :class="{ active: i === store.playlistIndex }"
              @dblclick="onListClick(i)"
            >
              <span class="pl-name">{{ s.name }}</span>
              <span class="pl-artist">
                <el-tag size="small" :type="s.source === 'kugou' ? 'warning' : 'danger'" effect="plain">
                  {{ s.source === 'kugou' ? 'KG' : 'NE' }}
                </el-tag>
                {{ s.artist }}
              </span>
            </div>
          </el-scrollbar>
          <el-button v-if="store.playlist.length > 0" text size="small" style="margin-top: 6px" @click="store.playlist = []">
            清空列表
          </el-button>
        </div>
      </el-popover>

      <el-slider
        v-model="store.volume"
        :min="0" :max="1" :step="0.05"
        :show-tooltip="false"
        style="width: 80px;"
      />
    </div>
  </div>
</template>

<style scoped>
.player-bar {
  position: fixed;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 1000px;
  height: 64px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 14px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 100;
  backdrop-filter: blur(12px);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
}

.player-left {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 220px;
  flex-shrink: 0;
}

.song-cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  flex-shrink: 0;
}
.song-cover-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
}

.song-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
.song-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.song-artist {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  padding: 0 12px;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ctrl-btn {
  color: var(--el-text-color-regular);
}
.ctrl-btn:hover, .ctrl-btn.active {
  color: var(--el-color-primary);
}

.play-btn {
  width: 36px;
  height: 36px;
  margin: 0 4px;
}

.progress-area {
  width: 100%;
  max-width: 400px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.time {
  font-size: 10px;
  color: var(--el-text-color-secondary);
  min-width: 32px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--el-fill-color);
  border-radius: 2px;
  cursor: pointer;
}
.progress-bar:hover { height: 6px; }
.progress-fill {
  height: 100%;
  background: var(--el-color-primary);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.player-right {
  width: 170px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

/* 播放列表弹窗 */
.playlist-popover { user-select: none; }
.pl-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  gap: 8px;
}
.pl-item:hover { background: var(--el-fill-color-light); }
.pl-item.active { color: var(--el-color-primary); font-weight: 500; }
.pl-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pl-artist {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
