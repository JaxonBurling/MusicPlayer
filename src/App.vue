<script setup lang="ts">
import { window } from '@tauri-apps/api'

import { ref, watch, onMounted, computed } from 'vue'
import { RouterView } from 'vue-router'
import {
  FullScreen, MoreFilled, Search, Minus, Close, Sunny, User, Moon,
} from '@element-plus/icons-vue'
import { useAppStore } from './state'
import { useRouter } from 'vue-router'
import Player from './component/Player.vue'

const appStore = useAppStore()
const router = useRouter()

const searchInput = ref('')
const darkMode = ref(false)

// 当前音源的用户头像（响应式）
const avatarUrl = computed(() => {
  const u = appStore.currentUser()
  return u?.avatarUrl || ''
})

// 初始化
onMounted(async () => {
  // 深色模式
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') {
    darkMode.value = true
    document.documentElement.classList.add('dark')
  } else if (saved === 'light') {
    darkMode.value = false
  } else {
    const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
    darkMode.value = prefersDark
    if (prefersDark) document.documentElement.classList.add('dark')
  }
  appStore.darkMode = darkMode.value

  // 加载所有已登录音源的用户信息（保留当前音源）
  const origSource = appStore.source
  if (appStore.kugouLogin) {
    appStore.source = 'kugou'
    await appStore.loadUserInfo()
  }
  if (appStore.neteaseLogin) {
    appStore.source = 'netease'
    await appStore.loadUserInfo()
  }
  appStore.source = origSource
})

// 切换音源 → 刷新用户信息
watch(() => appStore.source, async () => {
  if (appStore.isLoggedIn() && !appStore.currentUser()) {
    await appStore.loadUserInfo()
  }
})

watch(darkMode, (val) => {
  appStore.darkMode = val
  document.documentElement.classList.toggle('dark', val)
  localStorage.setItem('theme', val ? 'dark' : 'light')
})

function onSearchEnter() {
  const kw = searchInput.value.trim()
  if (!kw) return
  router.push({ name: 'search', query: { q: kw } })
}

function onAvatarClick() {
  router.push(appStore.isLoggedIn() ? '/user' : '/login')
}

const handleAvatarError = () => true
</script>

<template>
<el-affix :offset="0">
    <div data-tauri-drag-region class="drag-region">
      <el-switch v-model="darkMode" :active-icon="Moon" :inactive-icon="Sunny" style="margin-left: 20px" />
      <div>
        <el-button :icon="Minus" text class="titlebar-button" @click="window.getCurrentWindow().minimize()" />
        <el-button :icon="FullScreen" text class="titlebar-button" @click="window.getCurrentWindow().toggleMaximize()" />
        <el-button :icon="Close" text class="titlebar-button" style="margin-right: 5px" @click="window.getCurrentWindow().close()" />
      </div>
    </div>
  </el-affix>


  <el-container style="margin: 0 5px">
    <el-header class="header">
      <div>
        <el-popover trigger="click" placement="bottom-start">
          <template #reference>
            <el-button text style="width: 30px">
              <el-icon :size="20"><MoreFilled /></el-icon>
            </el-button>
          </template>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <el-button text @click="router.push('/')">首页</el-button>
            <el-button text @click="router.push('/search')" style="margin-left: 0;">搜索</el-button>
          </div>
        </el-popover>
      </div>

      <el-input
        v-model="searchInput" class="search-input" placeholder="搜索歌曲..."
        :prefix-icon="Search" clearable @keyup.enter="onSearchEnter"
      />

      <div class="header-right">
        <img src="/kugou.png" style="height: 22px; width: auto" alt="酷狗" />
        <el-switch :model-value="appStore.source === 'netease'" @change="appStore.toggleSource()" />
        <img src="/wyy.png" style="height: 22px; width: auto" alt="网易云" />
        <el-avatar
          :size="40" :src="avatarUrl" @error="handleAvatarError"
          style="margin-left: 20px; cursor: pointer" @click="onAvatarClick"
        >
          <el-icon :size="20"><User /></el-icon>
        </el-avatar>
      </div>
    </el-header>

    <el-divider style="margin: 0" />

    <el-main>
      <router-view />
    </el-main>
  </el-container>

  <Player />
</template>

<style scoped>
.drag-region { height: 40px; background: var(--el-bg-color); user-select: none; display: flex; justify-content: space-between; align-items: center; }
.titlebar-button { display: inline-flex; width: 30px; height: 30px; user-select: none; }
.header { font-size: 22px; letter-spacing: 2px; padding: 10px; display: flex; align-items: center; justify-content: space-between; }
.header-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.search-input { width: 40%; min-width: 100px; }
</style>
