<script setup lang="ts">
/**
 * 登录页面 - 仅支持二维码登录和手机验证码登录
 * 切换音源时自动重启登录进程
 */
import { ref, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAppStore } from '../state'
import { getQrKey, createQr, checkQr, sendCaptcha, loginByPhone } from '../api/index'

const store = useAppStore()
const router = useRouter()

const tab = ref<'qr' | 'phone'>('qr')

// ===== 二维码登录 =====
const qrImage = ref('')
const qrStatus = ref('')
const qrTimer = ref<ReturnType<typeof setInterval>>()
const qrKey = ref('') // 保存当前 key 用于停止旧进程后不再轮询

async function startQrLogin() {
  // 清除旧轮询
  stopQrPolling()
  qrImage.value = ''
  qrStatus.value = '正在生成二维码...'

  try {
    const result = await getQrKey(store.source)
    if (!result.key) { qrStatus.value = '获取二维码失败'; return }
    qrKey.value = result.key
    const key = result.key

    // 酷狗 key 接口已直接返回图片，网易云需额外请求
    let img = result.image || ''
    if (!img) {
      img = await createQr(store.source, key)
    }
    if (!img) {
      console.warn('二维码图片为空')
      qrStatus.value = '二维码生成失败，请重试'
      return
    }
    qrImage.value = img.startsWith('data:') ? img : `data:image/png;base64,${img}`
    qrStatus.value = '请使用对应平台 App 扫码登录'

    // 轮询扫码状态
    qrTimer.value = setInterval(async () => {
      if (qrKey.value !== key) return // 已切换，忽略旧结果
      try {
        const result = await checkQr(store.source, key)
        if (result.status === 'success' && result.credential) {
          stopQrPolling()
          qrStatus.value = '登录成功！'
          const { token, cookie, userId } = result.credential
          store.saveLogin(store.source, cookie || '', token, userId)
          await store.loadUserInfo()
          ElMessage.success('登录成功')
          setTimeout(() => router.replace('/'), 500)
        } else if (result.status === 'scanned') {
          qrStatus.value = '已扫描，请在手机上确认'
        } else if (result.status === 'expired') {
          stopQrPolling()
          qrStatus.value = '二维码已过期，请重新生成'
          qrImage.value = ''
        }
      } catch { /* 轮询失败继续 */ }
    }, 2000)
  } catch (e) {
    console.error('QR登录异常:', e)
    qrStatus.value = '网络错误，请重试'
  }
}

function stopQrPolling() {
  if (qrTimer.value) { clearInterval(qrTimer.value); qrTimer.value = undefined }
  qrKey.value = ''
}

// 监听音源切换 → 重启二维码登录
watch(() => store.source, () => {
  if (tab.value === 'qr') startQrLogin()
})

// ===== 手机验证码登录 =====
const phone = ref('')
const code = ref('')
const sending = ref(false)
const countdown = ref(0)
const loginLoading = ref(false)

async function doSendCaptcha() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    ElMessage.warning('请输入正确的手机号')
    return
  }
  sending.value = true
  try {
    await sendCaptcha(store.source, phone.value)
    ElMessage.success('验证码已发送')
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
  } catch {
    ElMessage.error('发送失败')
  } finally { sending.value = false }
}

async function doPhoneLogin() {
  if (!phone.value || !code.value) { ElMessage.warning('请输入手机号和验证码'); return }
  loginLoading.value = true
  try {
    const cred = await loginByPhone(store.source, phone.value, code.value)
    if (cred) {
      const { token, cookie, userId } = cred
      store.saveLogin(store.source, cookie || '', token, userId)
      await store.loadUserInfo()
      ElMessage.success('登录成功')
      router.replace('/')
    } else {
      ElMessage.error('登录失败，请检查验证码')
    }
  } catch { ElMessage.error('登录请求失败') }
  finally { loginLoading.value = false }
}

startQrLogin()

onUnmounted(() => stopQrPolling())
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h2>登录 - {{ store.source === 'kugou' ? '酷狗音乐' : '网易云音乐' }}</h2>

      <div class="tab-bar">
        <span :class="{ active: tab === 'qr' }" @click="tab = 'qr'">二维码登录</span>
        <span :class="{ active: tab === 'phone' }" @click="tab = 'phone'">验证码登录</span>
      </div>

      <!-- 二维码 -->
      <div v-if="tab === 'qr'" class="qr-section">
        <div class="qr-box">
          <img v-if="qrImage" :src="qrImage" alt="QR Code" class="qr-img" />
          <el-icon v-else :size="80" color="var(--el-text-color-placeholder)">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v3h2v-3h2v-2h-2v-2h-2v2h-2v2h2v3h-2v2h8v-2h-6z"/></svg>
          </el-icon>
        </div>
        <p class="qr-status">{{ qrStatus }}</p>
        <el-button text type="primary" @click="startQrLogin">
          重新生成二维码
        </el-button>
      </div>

      <!-- 手机验证码 -->
      <div v-else class="phone-section">
        <el-input v-model="phone" placeholder="输入手机号" size="large" maxlength="11" clearable />
        <div class="code-row">
          <el-input v-model="code" placeholder="验证码" size="large" maxlength="6" clearable />
          <el-button size="large" :disabled="countdown > 0 || sending" :loading="sending" @click="doSendCaptcha">
            {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
          </el-button>
        </div>
        <el-button type="primary" size="large" :loading="loginLoading" style="width: 100%; margin-top: 12px" @click="doPhoneLogin">
          登录
        </el-button>
      </div>

      <el-button text style="margin-top: 16px" @click="router.back()">返回</el-button>
    </div>
  </div>
</template>

<style scoped>
.login-page { display: flex; justify-content: center; padding-top: 30px; }
.login-card { width: 380px; display: flex; flex-direction: column; align-items: center; }
.login-card h2 { font-size: 18px; margin-bottom: 20px; font-weight: 600; }
.tab-bar { display: flex; gap: 24px; margin-bottom: 24px; }
.tab-bar span { cursor: pointer; font-size: 14px; color: var(--el-text-color-secondary); padding-bottom: 4px; border-bottom: 2px solid transparent; transition: all 0.2s; }
.tab-bar span.active { color: var(--el-color-primary); border-color: var(--el-color-primary); }
.qr-section { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.qr-box { width: 200px; height: 200px; border: 1px solid var(--el-border-color); border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.qr-img { width: 100%; height: 100%; object-fit: contain; }
.qr-status { font-size: 13px; color: var(--el-text-color-secondary); text-align: center; margin: 0; }
.phone-section { width: 100%; display: flex; flex-direction: column; gap: 12px; }
.code-row { display: flex; gap: 8px; }
.code-row .el-button { flex-shrink: 0; }
</style>
