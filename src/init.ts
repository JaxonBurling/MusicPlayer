import { TrayIcon, TrayIconOptions } from "@tauri-apps/api/tray";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Image } from "@tauri-apps/api/image";
import { Menu } from "@tauri-apps/api/menu";
import { window } from "@tauri-apps/api";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { moveWindow, Position } from "@tauri-apps/plugin-positioner";

// 托盘菜单
const trayWindow = new WebviewWindow('traymenu', {
  url: '/traymenu',           // 窗口加载的路由或页面
  title: '托盘菜单',
  width: 400,
  height: 300,
  resizable: false,
  decorations: false,
  alwaysOnTop: true,
  skipTaskbar: true
});

const menu = await Menu.new({
  items: [
    {
      id: "quit",
      text: "退出",
      action: async () => {
        const windows = await window.getAllWindows();
        windows.forEach((w) => w.close());
      },
    },
  ],
});

const options: TrayIconOptions = {
  id: "MusicPlayer",
  title: "MusicPlayer",
  tooltip: "A convenient Music Player",
  icon: await defaultWindowIcon() as Image,
  showMenuOnLeftClick: false,
  menu,
  action: async (event) => {
    if (event.type == "Click") {
      if (event.button == "Left"){
        const w = await WebviewWindow.getByLabel("main") || window.getCurrentWindow()
        w.show()
        await w.setFocus()
      } else if (event.button == "Right") {
        moveWindow(Position.TrayLeft)
        trayWindow.show()
        trayWindow.setFocus()
      }
    }
  },
};

export async function init() {
  if (window.getCurrentWindow().label=="traymenu")return
  trayWindow.once('tauri://created', () => {
    console.log('Successfully created Tray window');
  });
  trayWindow.once('tauri://error', (e) => {
    console.error('Failed to create Tray window', e);
  });
  trayWindow.onFocusChanged(({payload: focused}) => {
    if (!focused)trayWindow.hide()
  })
  await TrayIcon.new(options)
}
