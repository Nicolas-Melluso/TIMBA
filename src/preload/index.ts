import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("timbaDesktop", {
  platform: process.platform
});
