<script setup lang="ts">
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
import { ref } from "vue";
import { RouterView } from "vue-router";
import { Search, User } from "@element-plus/icons-vue";

const search_inp = ref("");
const rolled = ref(false);
const source = ref(false);
const avatarUrl = ref("https://auth.overpass.top/api/profile/avatar/")

if (localStorage.getItem("auth")) {
  avatarUrl.value = avatarUrl.value + localStorage.getItem
} else {avatarUrl.value = ''}

const handleAvatarError = () => {
  console.log('头像加载失败')
  return true
}

function roll() {
  rolled.value = !rolled.value;
}
</script>

<template>
    <el-container>
        <el-header class="header">
          <div class="header-left">
            <a
              id="menuScroll" 
              href="javascript:void(0)" 
              @click="roll"
            >
              {{ rolled ? "✕" : "☰" }}
            </a>
          </div>

            <el-input
                v-model="search_inp"
                class="search-input"
                placeholder="Search song..."
                :prefix-icon="Search"
        >
        </el-input>
        <div class="header-right">
            <el-switch
              v-model="source"
              active-text="网易云"
              inactive-text="酷狗"
              active-color="#13ce66"
              inactive-color="#ff4949"
            />
            <el-avatar :size="40" :src="avatarUrl" @error="handleAvatarError">
              <el-icon :size="20"><User /></el-icon>
            </el-avatar>
        </div>
      </el-header>
        <el-divider style="margin: 0" />
        <el-main><router-view /></el-main>
    </el-container>
</template>

<style scoped>
a {
  text-decoration: none;
}


.header {
    font-size: 22px;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
    background-color: #3375B9;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.search-input {
    width: 30%;
    min-width: 100px;
}

#menuScroll {
  color: #fff;
}
</style>
