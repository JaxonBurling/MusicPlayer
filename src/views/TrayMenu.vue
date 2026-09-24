<template>
<div class="tmenu">
    <el-space style="height: 100px;justify-content: center;">
        <el-button :icon="ArrowLeftBold" text />
        <el-button text circle class="play-toggle" @click="togglePlay">
            <span class="icon-slot" :class="{ playing }">
                <!-- 播放：三角 -->
                <svg class="ic ic-play" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
                </svg>
                <!-- 暂停：双条 -->
                <svg class="ic ic-pause" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1.5" />
                    <rect x="14" y="4" width="4" height="16" rx="1.5" />
                </svg>
            </span>
        </el-button>
        <el-button :icon="ArrowRightBold" text />
    </el-space>
    <el-button
    v-for="b in menus"
    class="but"
    :key="b.text"
    @click="b.click"
    size="large"
    text>{{b.text}}</el-button>
</div>
</template>
<script setup lang="ts">
import { ArrowLeftBold, ArrowRightBold } from '@element-plus/icons-vue';
import { window } from '@tauri-apps/api';
import { emit, listen } from '@tauri-apps/api/event';
import { ref, onMounted } from 'vue';

const playing = ref(false)

onMounted(async () => {
  // 与主窗口播放状态保持同步（媒体键或主窗口触发）
  await listen('media-play', () => (playing.value = true))
  await listen('media-pause', () => (playing.value = false))
})

/** 切换播放/暂停：广播事件交由主窗口执行 */
function togglePlay() {
  playing.value = !playing.value
  emit(playing.value ? 'media-play' : 'media-pause')
}

const menus = [
  {
    text: "上一首", click: () => {}},
  {text: "下一首", click: ()=>{}},
  {text: "退出", click: () =>window.getAllWindows().then((e) => e.forEach((win)=>win.close()))}
]
</script>
<style scoped>
.tmenu {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--el-bg-color);
}
.but {
    margin: 0;
}
.play-toggle {
    color: var(--el-text-color-regular);
    transition: color 0.25s ease;
}
.play-toggle:hover {
    color: var(--el-color-primary);
}
.icon-slot {
    position: relative;
    display: inline-flex;
    width: 26px;
    height: 26px;
}
.ic {
    position: absolute;
    inset: 0;
    fill: currentColor; /* 跟随主题文字色，自动适配暗黑模式 */
    transform-origin: 50% 50%;
    transition: opacity 0.28s ease, transform 0.34s cubic-bezier(0.34, 1.56, 0.64, 1);
    will-change: opacity, transform;
}
/* 暂停态：显示播放三角，隐藏暂停双条 */
.ic-play { opacity: 1; transform: translateX(-1.5px) scale(1) rotate(0deg); }
.ic-pause { opacity: 0; transform: scale(0.3) rotate(-90deg); }
/* 播放态：显示暂停双条，隐藏播放三角 */
.icon-slot.playing .ic-play { opacity: 0; transform: translateX(-1.5px) scale(0.3) rotate(90deg); }
.icon-slot.playing .ic-pause { opacity: 1; transform: scale(1) rotate(0deg); }
@media (prefers-reduced-motion: reduce) {
    .ic { transition: none; }
}
</style>
