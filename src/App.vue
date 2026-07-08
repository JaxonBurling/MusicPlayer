<script setup lang="ts">
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
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

const search_inp = ref("");
const source = ref(false);
const darkMode = ref(false);
const avatarUrl = ref("https://auth.overpass.top/api/profile/avatar/");

if (localStorage.getItem("auth")) {
    avatarUrl.value = avatarUrl.value + localStorage.getItem;
} else {
    avatarUrl.value = "";
}

const handleAvatarError = () => {
    console.log("头像加载失败");
    return true;
};

onMounted(() => {
    // Initialize dark mode from localStorage
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
