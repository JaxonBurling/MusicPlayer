import { TrayIcon, TrayIconOptions } from "@tauri-apps/api/tray";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Image } from "@tauri-apps/api/image";
import { Menu } from "@tauri-apps/api/menu";
import { window } from "@tauri-apps/api";

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
  menu
};

export async function init() {
  await TrayIcon.new(options)
}
