<script setup lang="ts">
<<<<<<< Updated upstream
import { window } from "@tauri-apps/api";
import { ref, watch, onMounted } from "vue";
import { RouterView } from "vue-router";
import {
    Search,
    User,
    Minus,
    FullScreen,
    Close,
    Sunny,
    Moon,
} from "@element-plus/icons-vue";
import { useAppStore } from "./state";

const appStore = useAppStore();
const rolled = ref(false);
const search_inp = ref("");
const source = ref(false);
const darkMode = ref(false);
const avatarUrl = ref("https://auth.overpass.top/api/profile/avatar/");
=======
import { window } from '@tauri-apps/api'

import { ref, watch, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import {
  FullScreen,
  MoreFilled,
  Search,
  Minus,
  Close,
  Sunny,
  User,
  Moon,
} from '@element-plus/icons-vue'
import { useAppStore } from './state'
import { useRouter } from 'vue-router'
import Player from './component/Player.vue'

const appStore = useAppStore()
const router = useRouter()

const searchInput = ref('')
const darkMode = ref(false)
>>>>>>> Stashed changes

// 当前音源头像
const avatarUrl = ref('')
watch(() => appStore.source, async () => {
  const u = appStore.currentUser()
  avatarUrl.value = u?.avatarUrl || ''
  // 切换音源后尝试加载用户信息
  if (appStore.isLoggedIn() && !u) {
    await appStore.loadUserInfo()
    avatarUrl.value = appStore.currentUser()?.avatarUrl || ''
  }
}, { immediate: true })

// 初始化时尝试加载用户头像
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

  // 加载用户信息获取头像
  if (appStore.isLoggedIn()) {
    await appStore.loadUserInfo()
    avatarUrl.value = appStore.currentUser()?.avatarUrl || ''
  }
})

watch(darkMode, (val) => {
  appStore.darkMode = val
  if (val) document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
  localStorage.setItem('theme', val ? 'dark' : 'light')
})

/** 搜索框回车 → 跳转搜索页面 */
function onSearchEnter() {
  const kw = searchInput.value.trim()
  if (!kw) return
  router.push({ name: 'search', query: { q: kw } })
}

<<<<<<< Updated upstream
function roll() {
  rolled.value = !rolled.value;
}

const handleAvatarError = () => {
    console.log("头像加载失败");
    return true;
};

onMounted(() => {
    if (localStorage.getItem("theme") === "dark") {
        darkMode.value = true;
    }
});

watch(darkMode, appStore.toggleDarkMode);
</script>

<template>
    <div data-tauri-drag-region class="drag-region">
        <el-button
            :icon="Minus"
            text
            class="titlebar-button"
            @click="window.getCurrentWindow().minimize()"
        />
        <el-button
            :icon="FullScreen"
            text
            class="titlebar-button"
            @click="window.getCurrentWindow().toggleMaximize()"
        />
        <el-button
            :icon="Close"
            text
            class="titlebar-button"
            @click="window.getCurrentWindow().close()"
        />
    </div>
    <el-container style="margin: 0 5px">
        <el-header class="header">
            <div class="header-left">
                <span
                  class="burger"
                  :class="{ active : rolled}"
                  @click="roll"
                >
                  <span class="burger-line"></span>
                  <span class="burger-line"></span>
                  <span class="burger-line"></span>
                </span>
                <el-switch
                    v-model="darkMode"
                    :active-icon="Moon"
                    :inactive-icon="Sunny"
                />
            </div>
=======
/** 头像点击 → 根据登录状态跳转 */
function onAvatarClick() {
  if (appStore.isLoggedIn()) {
    router.push('/user')
  } else {
    router.push('/login')
  }
}

const handleAvatarError = () => { return true }
</script>

<template>
  <div data-tauri-drag-region class="drag-region">
    <el-switch
      v-model="darkMode"
      :active-icon="Moon"
      :inactive-icon="Sunny"
      style="margin-left: 20px"
    />
    <div>
      <el-button :icon="Minus" text class="titlebar-button" @click="window.getCurrentWindow().minimize()" />
      <el-button :icon="FullScreen" text class="titlebar-button" @click="window.getCurrentWindow().toggleMaximize()" />
      <el-button :icon="Close" text class="titlebar-button" style="margin-right: 5px" @click="window.getCurrentWindow().close()" />
    </div>
  </div>
>>>>>>> Stashed changes

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
        v-model="searchInput"
        class="search-input"
        placeholder="搜索歌曲..."
        :prefix-icon="Search"
        clearable
        @keyup.enter="onSearchEnter"
      />

      <div class="header-right">
        <img src="/kugou.png" style="height: 22px; width: auto" alt="酷狗" />
        <el-switch
          :model-value="appStore.source === 'netease'"
          @change="appStore.toggleSource()"
        />
        <img src="/wyy.png" style="height: 22px; width: auto" alt="网易云" />
        <el-avatar
          :size="40"
          :src="avatarUrl"
          @error="handleAvatarError"
          style="margin-left: 20px; cursor: pointer"
          @click="onAvatarClick"
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
.burger {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 24px;
    height: 20px;
    cursor: pointer;
    user-select: none;
    flex-shrink: 0;
}

.burger-line {
    display: block;
    height: 3px;
    width: 100%;
    background-color: #333;
    border-radius: 3px;
    transition: all 0.3s ease;
    transform-origin: left center;
}

html.dark .burger-line {
    background-color: #fff;
}

.burger.active .burger-line:nth-child(1) {
    transform: translateX(calc(100% - 100% * 0.7071)) rotate(45deg);
}

.burger.active .burger-line:nth-child(2) {
    opacity: 0;
    transform: scaleX(0);
}

.burger.active .burger-line:nth-child(3) {
    transform: translateX(calc(100% - 100% * 0.7071)) rotate(-45deg);
}

.drag-region {
<<<<<<< Updated upstream
    height: 40px;
    background: var(--el-bg-color);
    user-select: none;
    display: flex;
    justify-content: flex-end;
    align-items: center;
=======
  height: 40px;
  background: var(--el-bg-color);
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
>>>>>>> Stashed changes
}

.titlebar-button {
  display: inline-flex;
  width: 30px;
  height: 30px;
  user-select: none;
}

.header {
<<<<<<< Updated upstream
    font-size: 22px;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    justify-content: space-between;
=======
  font-size: 22px;
  letter-spacing: 2px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
>>>>>>> Stashed changes
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.search-input {
  width: 40%;
  min-width: 100px;
}
</style>