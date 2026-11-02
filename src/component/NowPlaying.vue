<script setup lang="ts">
/**
 * 歌曲播放页
 *
 * - 由底部播放条空白处点击展开，从底部滑入
 * - 顶部居中歌名 / 歌手，左侧专辑封面，右侧滚动歌词
 * - 双击歌词跳转播放进度，右上角向下箭头收起
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ArrowDown, Back, Right, VideoPause, VideoPlay,
  Star, StarFilled, Headset, Loading,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '../state'
import { getLyric } from '../api/index'
import { findActiveLine, parseLyrics } from '../lyrics'
import type { LyricLine } from '../lyrics'

const store = useAppStore()

const lyricLines = ref<LyricLine[]>([])
const plainLyrics = ref<string[]>([])
const lyricLoading = ref(false)
const lyricEmpty = ref(false)
const lyricBody = ref<HTMLElement>()

const song = computed(() => store.currentSong)
const cover = computed(() => song.value?.pic || '')
const bgStyle = computed(() => (cover.value ? { backgroundImage: `url("${cover.value}")` } : {}))

/** 音频元数据尚未加载时用歌曲信息兜底（酷狗部分接口以毫秒返回时长） */
const totalDuration = computed(() => {
  if (store.duration > 0) return store.duration
  const raw = song.value?.duration || 0
  if (!raw) return 0
  return song.value?.source === 'kugou' && raw > 1000 ? raw / 1000 : raw
})
const progress = computed(() =>
  totalDuration.value > 0 ? Math.min(100, (store.currentTime / totalDuration.value) * 100) : 0,
)
const activeIndex = computed(() => findActiveLine(lyricLines.value, store.currentTime))

let lyricToken = 0
let lyricKey = ''
let autoScroll = true
let resumeTimer: ReturnType<typeof setTimeout> | undefined
let previousBodyOverflow = ''

function formatTime(seconds?: number): string {
  if (!seconds || !isFinite(seconds) || seconds < 0) return '00:00'
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

/** 加载并解析歌词 */
async function loadLyrics(force = false) {
  const current = song.value
  if (!current) {
    lyricLines.value = []
    plainLyrics.value = []
    lyricEmpty.value = true
    return
  }

  const key = `${current.source}:${current.hash || current.id || current.name}`
  if (!force && key === lyricKey) return
  lyricKey = key

  const token = ++lyricToken
  lyricLoading.value = true
  lyricEmpty.value = false
  lyricLines.value = []
  plainLyrics.value = []

  try {
    const raw = await getLyric(current)
    if (token !== lyricToken) return
    const parsed = parseLyrics(raw)
    lyricLines.value = parsed.lines
    plainLyrics.value = parsed.plain
    lyricEmpty.value = parsed.lines.length === 0 && parsed.plain.length === 0
    await nextTick()
    scrollToActive(false)
  } catch {
    if (token === lyricToken) lyricEmpty.value = true
  } finally {
    if (token === lyricToken) lyricLoading.value = false
  }
}

/** 让当前歌词滚动到可视区中间 */
function scrollToActive(smooth = true) {
  const body = lyricBody.value
  if (!body) return
  const index = activeIndex.value
  if (index < 0) return
  const line = body.querySelector<HTMLElement>(`[data-line="${index}"]`)
  if (!line) return
  const top = line.offsetTop - body.clientHeight / 2 + line.clientHeight / 2
  body.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' })
}

/** 用户手动滚动时暂停自动跟随，4 秒后恢复 */
function pauseAutoScroll() {
  autoScroll = false
  if (resumeTimer) clearTimeout(resumeTimer)
  resumeTimer = setTimeout(() => {
    autoScroll = true
    scrollToActive(true)
  }, 4000)
}

function seekToLine(line: LyricLine) {
  store.seekTo(line.time)
  autoScroll = true
  if (resumeTimer) clearTimeout(resumeTimer)
  nextTick(() => scrollToActive(false))
}

function seekProgress(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement
  const pct = (event.clientX - el.getBoundingClientRect().left) / el.offsetWidth
  if (totalDuration.value > 0) store.seekTo(pct * totalDuration.value)
}

function toggleFavorite() {
  if (!song.value) return
  store.toggleFavorite(song.value)
  ElMessage.success(store.isFavorite(song.value) ? '已加入本地收藏' : '已取消收藏')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') store.closeNowPlaying()
}

watch(activeIndex, (index, previous) => {
  if (index >= 0 && index !== previous && autoScroll) scrollToActive(true)
})

watch(song, () => { void loadLyrics(true) })

onMounted(async () => {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKeydown)
  await loadLyrics(true)
})

onUnmounted(() => {
  lyricToken++ // 丢弃仍在途的歌词请求
  document.body.style.overflow = previousBodyOverflow
  document.removeEventListener('keydown', onKeydown)
  if (resumeTimer) clearTimeout(resumeTimer)
})
</script>

<template>
  <div class="now-playing">
    <!-- 模糊专辑背景 -->
    <div class="np-bg" :style="bgStyle" />
    <div class="np-mask" />
    <div class="np-glow" />

    <!-- 顶部：歌名 / 歌手 / 收起 -->
    <header class="np-header">
      <div class="np-heading">
        <h1 class="np-title">{{ song?.name || '未在播放' }}</h1>
        <p class="np-subtitle">
          {{ song?.artist || '选择一首歌曲开始播放' }}
          <span v-if="song?.album" class="np-album"> · {{ song.album }}</span>
        </p>
      </div>
      <el-tooltip content="收起播放页" placement="bottom">
        <button class="np-close" aria-label="收起播放页" @click="store.closeNowPlaying()">
          <el-icon :size="22"><ArrowDown /></el-icon>
        </button>
      </el-tooltip>
    </header>

    <main class="np-main">
      <!-- 左：专辑 + 控制 -->
      <section class="np-left">
        <div class="np-cover-wrap">
          <div class="np-cover-ring" :class="{ playing: store.isPlaying }" />
          <div class="np-cover">
            <el-image v-if="cover" :src="cover" fit="cover" class="np-cover-img">
              <template #error>
                <div class="np-cover-fallback"><el-icon :size="64"><Headset /></el-icon></div>
              </template>
            </el-image>
            <div v-else class="np-cover-fallback"><el-icon :size="64"><Headset /></el-icon></div>
          </div>
        </div>

        <div class="np-controls">
          <button class="np-ctrl" :disabled="store.playlist.length === 0" @click="store.prev()">
            <el-icon :size="24"><Back /></el-icon>
          </button>
          <button class="np-play" :disabled="!song" @click="store.togglePlay()">
            <el-icon :size="26">
              <VideoPause v-if="store.isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>
          <button class="np-ctrl" :disabled="store.playlist.length === 0" @click="store.next()">
            <el-icon :size="24"><Right /></el-icon>
          </button>
        </div>

        <div class="np-progress">
          <span class="np-time">{{ formatTime(store.currentTime) }}</span>
          <div class="np-progress-bar" @click="seekProgress">
            <div class="np-progress-fill" :style="{ width: progress + '%' }" />
          </div>
          <span class="np-time">{{ formatTime(totalDuration) }}</span>
        </div>

        <div class="np-meta">
          <el-tag size="small" effect="plain" round class="np-source-tag">
            {{ song?.source === 'kugou' ? '酷狗音乐' : '网易云音乐' }}
          </el-tag>
          <button class="np-fav" @click="toggleFavorite">
            <el-icon :size="15">
              <StarFilled v-if="song && store.isFavorite(song)" />
              <Star v-else />
            </el-icon>
            {{ song && store.isFavorite(song) ? '已收藏' : '收藏' }}
          </button>
        </div>
      </section>

      <!-- 右：歌词 -->
      <section class="np-lyrics">
        <div class="np-lyric-head">
          <span>歌词</span>
          <span class="np-lyric-tip">双击歌词跳转播放进度</span>
        </div>

        <div v-if="lyricLoading" class="np-lyric-loading">
          <el-skeleton :rows="7" animated />
        </div>

        <div
          v-else-if="lyricLines.length > 0"
          ref="lyricBody"
          class="np-lyric-scroll"
          @wheel.passive="pauseAutoScroll"
          @touchmove.passive="pauseAutoScroll"
        >
          <div class="np-lyric-pad">
            <p
              v-for="(line, index) in lyricLines"
              :key="`${line.time}-${index}`"
              :data-line="index"
              class="np-lyric-line"
              :class="{ active: index === activeIndex }"
              @dblclick="seekToLine(line)"
            >
              {{ line.text }}
            </p>
          </div>
        </div>

        <div v-else-if="plainLyrics.length > 0" ref="lyricBody" class="np-lyric-scroll">
          <div class="np-lyric-pad">
            <p v-for="(line, index) in plainLyrics" :key="index" class="np-lyric-line plain">
              {{ line }}
            </p>
          </div>
        </div>

        <div v-else class="np-lyric-empty">
          <el-icon :size="40" class="np-empty-icon"><Headset /></el-icon>
          <p>{{ lyricEmpty ? '暂无歌词' : '纯音乐，请欣赏' }}</p>
          <span class="np-empty-sub">连接网络后可获取更多歌词</span>
        </div>

        <div v-if="lyricLoading" class="np-lyric-loading-tip">
          <el-icon class="is-loading"><Loading /></el-icon>
          正在加载歌词
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.now-playing {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
  background: #0a0c11;
  user-select: none;
}

/* 背景 */
.np-bg {
  position: absolute;
  inset: -60px;
  background-position: center;
  background-size: cover;
  filter: blur(64px) saturate(1.25) brightness(0.5);
  transform: scale(1.12);
  transition: background-image 0.4s ease;
}
.np-mask {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 15% 0%, rgba(255, 255, 255, 0.08), transparent 55%),
    linear-gradient(180deg, rgba(6, 8, 12, 0.5) 0%, rgba(6, 8, 12, 0.72) 48%, rgba(6, 8, 12, 0.92) 100%);
}
.np-glow {
  position: absolute;
  left: 12%;
  top: 18%;
  width: 42vw;
  height: 42vw;
  max-width: 560px;
  max-height: 560px;
  border-radius: 50%;
  background: var(--el-color-primary);
  opacity: 0.14;
  filter: blur(120px);
  pointer-events: none;
}

/* 顶部 */
.np-header {
  position: relative;
  z-index: 2;
  height: 96px;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 28px 40px 0;
}
.np-heading {
  text-align: center;
  max-width: 58%;
  min-width: 0;
}
.np-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);
}
.np-subtitle {
  margin: 7px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.62);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np-album { color: rgba(255, 255, 255, 0.4); }
.np-close {
  position: absolute;
  right: 34px;
  top: 24px;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: background 0.2s, color 0.2s, transform 0.2s;
}
.np-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  transform: translateY(2px);
}

/* 主体 */
.np-main {
  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 8px 56px 44px;
  display: grid;
  grid-template-columns: minmax(230px, 330px) minmax(0, 1fr);
  gap: clamp(32px, 6vw, 88px);
  align-items: stretch;
}

/* 左侧专辑 */
.np-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
}
.np-cover-wrap { position: relative; width: 100%; display: flex; justify-content: center; }
.np-cover-ring {
  position: absolute;
  inset: 6% 4%;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 12px rgba(255, 255, 255, 0.025), 0 0 60px rgba(0, 0, 0, 0.45);
  transition: box-shadow 0.4s ease;
}
.np-cover-ring.playing { box-shadow: 0 0 0 14px rgba(255, 255, 255, 0.045), 0 0 80px var(--el-color-primary-light-5); }
.np-cover {
  position: relative;
  z-index: 1;
  width: min(100%, 300px);
  aspect-ratio: 1;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
}
.np-cover-img { width: 100%; height: 100%; }
.np-cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.28);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
}

/* 控制 */
.np-controls { display: flex; align-items: center; justify-content: center; gap: 22px; margin-top: 26px; }
.np-ctrl {
  width: 38px; height: 38px; border: none; border-radius: 50%;
  background: transparent; color: rgba(255, 255, 255, 0.7);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: color 0.2s, background 0.2s;
}
.np-ctrl:hover:not(:disabled) { color: #fff; background: rgba(255, 255, 255, 0.1); }
.np-ctrl:disabled { opacity: 0.3; cursor: default; }
.np-play {
  width: 56px; height: 56px; border: none; border-radius: 50%;
  background: #fff; color: #10131a;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: transform 0.2s, background 0.2s;
  box-shadow: 0 8px 28px rgba(255, 255, 255, 0.16);
}
.np-play:hover:not(:disabled) { transform: scale(1.06); background: #f3f5f9; }
.np-play:disabled { opacity: 0.4; cursor: default; }

/* 进度 */
.np-progress { width: 100%; display: flex; align-items: center; gap: 10px; margin-top: 18px; }
.np-time { font-size: 11px; color: rgba(255, 255, 255, 0.48); min-width: 34px; text-align: center; font-variant-numeric: tabular-nums; }
.np-progress-bar { flex: 1; height: 4px; border-radius: 3px; background: rgba(255, 255, 255, 0.16); cursor: pointer; }
.np-progress-bar:hover { height: 5px; }
.np-progress-fill { height: 100%; border-radius: 3px; background: #fff; transition: width 0.1s linear; }

/* 元信息 */
.np-meta { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
.np-source-tag { color: rgba(255, 255, 255, 0.6); border-color: rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); }
.np-fav {
  display: inline-flex; align-items: center; gap: 5px;
  border: none; background: transparent; color: rgba(255, 255, 255, 0.55);
  font-size: 12px; cursor: pointer; padding: 4px 6px; border-radius: 6px;
  transition: color 0.2s, background 0.2s;
}
.np-fav:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }

/* 歌词 */
.np-lyrics {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: 4px;
}
.np-lyric-head {
  display: flex; align-items: baseline; gap: 12px;
  font-size: 12px; letter-spacing: 1px; color: rgba(255, 255, 255, 0.42);
  margin-bottom: 8px; padding-left: 2px;
}
.np-lyric-tip { font-size: 11px; letter-spacing: 0; color: rgba(255, 255, 255, 0.24); }
.np-lyric-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent);
}
.np-lyric-scroll::-webkit-scrollbar { display: none; }
.np-lyric-pad { padding: 32vh 0; }
.np-lyric-line {
  margin: 0;
  padding: 9px 4px;
  font-size: 16px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
  cursor: default;
  border-radius: 8px;
  transition: color 0.25s ease, font-size 0.25s ease, opacity 0.25s ease, transform 0.25s ease;
  transform-origin: left center;
}
.np-lyric-line:hover { color: rgba(255, 255, 255, 0.7); background: rgba(255, 255, 255, 0.04); }
.np-lyric-line.active {
  color: #fff;
  font-size: 19px;
  font-weight: 600;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.55);
}
.np-lyric-line.plain { cursor: default; color: rgba(255, 255, 255, 0.66); }
.np-lyric-loading { padding: 20px 4px; }
.np-lyric-loading :deep(.el-skeleton__item) { background: rgba(255, 255, 255, 0.1); }
.np-lyric-loading-tip {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 4px; font-size: 12px; color: rgba(255, 255, 255, 0.38);
}
.np-lyric-empty {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; color: rgba(255, 255, 255, 0.35);
}
.np-empty-icon { opacity: 0.6; }
.np-lyric-empty p { margin: 0; font-size: 14px; }
.np-empty-sub { font-size: 11px; color: rgba(255, 255, 255, 0.2); }

@media (max-width: 860px) {
  .np-main { padding: 8px 34px 30px; gap: 32px; grid-template-columns: minmax(200px, 260px) minmax(0, 1fr); }
  .np-cover { width: min(100%, 230px); }
  .np-lyric-line { font-size: 15px; }
  .np-lyric-line.active { font-size: 17px; }
}
@media (max-height: 680px) {
  .np-header { height: 76px; padding-top: 20px; }
  .np-main { padding-top: 0; padding-bottom: 24px; }
  .np-cover { width: min(100%, 210px); }
  .np-controls { margin-top: 16px; }
  .np-progress { margin-top: 12px; }
  .np-meta { margin-top: 8px; }
  .np-lyric-pad { padding: 26vh 0; }
}
</style>

<style>
/* 页面从底部滑入 / 滑出，组件挂载时由 Frame.vue 的 Transition 应用 */
.now-playing-enter-active,
.now-playing-leave-active {
  transition: transform 0.46s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease;
  will-change: transform;
}
.now-playing-enter-from,
.now-playing-leave-to {
  transform: translateY(100%);
  opacity: 0.45;
}
</style>
