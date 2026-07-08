<script setup lang="ts">
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
import { ref, watch } from "vue";
import { RouterView } from "vue-router";
import { Search, User } from "@element-plus/icons-vue";

const search_inp = ref("");
const rolled = ref(false);
const source = ref(false);
const darkMode = ref(false);
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

watch(darkMode, (newVal) => {
    if (newVal) {
        document.documentElement.classList.add('dark')
        document.body.style.backgroundColor = '#1a1a1a'
        document.body.style.color = '#e6e6e6'
    } else {
        document.documentElement.classList.remove('dark')
        document.body.style.backgroundColor = '#ffffff'
        document.body.style.color = '#333333'
    }
    localStorage.setItem('theme', newVal ? 'dark' : 'light')
})

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
            <el-switch
              v-model="darkMode"
              active-text="深色模式"
              inactive-text="浅色模式"
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
          <img src="/kugou.png" style="height: 22px; width: auto;" />
            <el-switch v-model="source"/>
            <img src="/wyy.png" style="height:22px; width: auto;" />
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
