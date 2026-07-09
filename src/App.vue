<script setup lang="ts">
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

if (localStorage.getItem("auth")) {
    avatarUrl.value = avatarUrl.value + localStorage.getItem;
} else {
    avatarUrl.value = "";
}

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

            <el-input
                v-model="search_inp"
                class="search-input"
                placeholder="Search song..."
                :prefix-icon="Search"
            >
            </el-input>
            <div class="header-right">
                <img src="/kugou.png" style="height: 22px; width: auto" />
                <el-switch v-model="source" />
                <img src="/wyy.png" style="height: 22px; width: auto" />
                <el-avatar
                    :size="40"
                    :src="avatarUrl"
                    @error="handleAvatarError"
                    style="margin-left: 20px"
                >
                    <el-icon :size="20"><User /></el-icon>
                </el-avatar>
            </div>
        </el-header>
        <el-divider style="margin: 0" />
        <el-main><router-view /></el-main>
    </el-container>
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
    height: 40px;
    background: var(--el-bg-color);
    user-select: none;
    display: flex;
    justify-content: flex-end;
    align-items: center;
}

.titlebar-button {
    display: inline-flex;
    width: 30px;
    height: 30px;
    user-select: none;
}

.header {
    font-size: 22px;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    justify-content: space-between;
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