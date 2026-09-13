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
  showMenuOnLeftClick: false,
  menu,
  action: async (event) => {
    if (event.type == "Click") {
      // const windows = await window.getAllWindows();
      // windows.forEach(async (w) => {
      //   // if (await w.activityName() == "main") {
      //   //   w.show()
      //   // }
      //   console.log(await w.activityName())
      // });
      const w = window.getCurrentWindow()
      w.show()
      await w.setFocus()
    }
  },
};

export async function init() {
  await TrayIcon.new(options)
}
