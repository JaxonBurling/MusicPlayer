import { TrayIcon, TrayIconOptions } from "@tauri-apps/api/tray";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Image } from "@tauri-apps/api/image";
import { window } from "@tauri-apps/api";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { moveWindow, Position } from "@tauri-apps/plugin-positioner";
import { LogicalPosition, PhysicalPosition } from "@tauri-apps/api/dpi";
import { emit, emitTo } from "@tauri-apps/api/event";

// 托盘菜单
const trayWindow = new WebviewWindow('traymenu', {
  url: '/traymenu',           // 窗口加载的路由或页面
  title: '托盘菜单',
  width: 400,
  height: 300,
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
  if (w.label == "traymenu") {
    return
  }
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
