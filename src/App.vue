<script setup lang="ts">
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
import { ref } from "vue";
import { RouterView } from "vue-router";
import { Search } from "@element-plus/icons-vue";

const search_inp = ref("");
</script>

<template>
    <el-container>
        <el-header class="header">
            <el-input
                v-model="search_inp"
                class="search-input"
                placeholder="Search song..."
                :prefix-icon="Search"
        /></el-header>
        <el-divider style="margin: 0" />
        <el-main><router-view /></el-main>
    </el-container>
</template>

<style scoped>
.header {
    font-size: 22px;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
}

.search-input {
    width: 30%;
    min-width: 100px;
}
</style>
