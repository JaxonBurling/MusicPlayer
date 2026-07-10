<script setup lang="ts">
/**
 * 用户详情页面
 * 展示当前音源已登录用户的信息
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAppStore } from '../state'

const store = useAppStore()
const router = useRouter()
const loading = ref(false)

onMounted(async () => {
  // 未登录则跳转登录页
  if (!store.isLoggedIn()) {
    router.replace('/login')
    return
  }
  // 刷新用户信息
  loading.value = true
  await store.loadUserInfo()
  loading.value = false
})

/** 退出登录 */
async function doLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    store.logout(store.source)
    ElMessage.success('已退出')
    router.replace('/')
  } catch { /* 取消 */ }
}

const user = () => store.currentUser()
</script>

<template>
  <div class="user-page" v-loading="loading">
    <div v-if="user()" class="user-card">
      <!-- 头像 -->
      <el-avatar :size="96" :src="user()!.avatarUrl">
        <el-icon :size="48"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg></el-icon>
      </el-avatar>

      <!-- 昵称 -->
      <h2>{{ user()!.nickname }}</h2>
      <p class="user-id">ID: {{ user()!.id }}</p>
      <el-tag v-if="user()!.vip" type="warning" effect="dark">VIP</el-tag>

      <!-- 音源信息 -->
      <div class="info-boxes">
        <div class="info-box">
          <span class="info-label">当前音源</span>
          <span class="info-val">{{ store.source === 'kugou' ? '酷狗音乐' : '网易云音乐' }}</span>
        </div>
      </div>

      <!-- 操作 -->
      <div class="actions">
        <el-button type="danger" plain @click="doLogout">退出登录</el-button>
        <el-button @click="router.push('/')">返回首页</el-button>
      </div>
    </div>

    <!-- 未登录 -->
    <div v-else-if="!loading" class="empty-state">
      <p>当前音源未登录</p>
      <el-button type="primary" @click="router.push('/login')">去登录</el-button>
    </div>
  </div>
</template>

<style scoped>
.user-page {
  max-width: 500px;
  margin: 0 auto;
  padding: 30px 0 80px;
}

.user-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.user-card h2 {
  margin: 0;
  font-size: 22px;
}

.user-id {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.info-boxes {
  width: 100%;
  margin-top: 16px;
}

.info-box {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.info-label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
.info-val {
  font-size: 14px;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 0;
}
.empty-state p {
  margin: 0;
  color: var(--el-text-color-secondary);
}
</style>
