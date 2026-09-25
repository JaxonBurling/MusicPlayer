import { TrayIcon, TrayIconOptions } from "@tauri-apps/api/tray";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Image } from "@tauri-apps/api/image";
import { window } from "@tauri-apps/api";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { emitTo, listen } from "@tauri-apps/api/event";
import { Command, type Child } from "@tauri-apps/plugin-shell";
import { useAppStore } from "./state";

/** 本地音乐 API 服务进程（仅生产环境启动，开发环境由 pnpm dev:all 提供） */
let serverProcess: Child | null = null;
async function startLocalServer() {
  if (!import.meta.env.PROD || serverProcess) return;
  try {
    const cmd = Command.sidecar("binaries/server");
    cmd.stdout.on("data", (d: string) => console.log("[server]", d));
    cmd.stderr.on("data", (d: string) => console.error("[server]", d));
    serverProcess = await cmd.spawn();
  } catch (e) {
    console.error("启动本地音乐服务失败:", e);
  }
}

// 托盘菜单
const trayWindow = new WebviewWindow('traymenu', {
  url: '/traymenu',           // 窗口加载的路由或页面
  title: '托盘菜单',
  width: 200,
  height: 250,
  resizable: false,
  decorations: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  visible: false
});

const options: TrayIconOptions = {
  id: "MusicPlayer",
  title: "MusicPlayer",
  tooltip: "A convenient Music Player",
  icon: await defaultWindowIcon() as Image,
  action: async (event) => {
    if (event.type == "Click") {
      if (event.button == "Left"){
        const w = await WebviewWindow.getByLabel("main") || window.getCurrentWindow()
        w.show()
        await w.setFocus()
      } else if (event.button == "Right") {
        console.log(event)
        emitTo(trayWindow.label, "show", {
          pos: event.position,
        })
      }
    }
  },
};

export async function init() {

  const w = window.getCurrentWindow()
  const appStore = useAppStore()
  // 深色模式：所有窗口（含托盘菜单）统一初始化，未手动设置时跟随系统
  const saved = localStorage.getItem('theme')
  appStore.applyDarkMode(saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches)
  if (w.label == "traymenu") {
    // 托盘菜单窗口：跟随主窗口的主题切换
    await listen<boolean>('theme-changed', ({ payload }) => appStore.applyDarkMode(payload))
    return
  }

  // 生产环境：随主窗口启动本地音乐 API 服务
  await startLocalServer()
  trayWindow.once('tauri://created', () => {
    console.log('Successfully created Tray window');
  });
  trayWindow.once('tauri://error', (e) => {
    console.error('Failed to create Tray window', e);
  });
  trayWindow.onFocusChanged(({payload: focused}) => {
    if (!focused)trayWindow.hide()
  })
  trayWindow.listen<{ pos: PhysicalPosition }>("show", async({ payload }) => {
    const winSize = await trayWindow.size()
    trayWindow.setPosition(new PhysicalPosition(payload.pos.x-winSize.width, payload.pos.y-winSize.height))
    trayWindow.show()
    trayWindow.setFocus()
  })
  await TrayIcon.new(options)
}
