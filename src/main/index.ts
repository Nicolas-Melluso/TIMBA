import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow, shell } from "electron";

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);
const userDataPath = join(app.getPath("appData"), "TIMBA-dev");
mkdirSync(userDataPath, { recursive: true });
app.setPath("userData", userDataPath);
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 680,
    title: "TIMBA!",
    backgroundColor: "#100f14",
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow) {
      return;
    }
    mainWindow.focus();
    mainWindow.moveTop();
    mainWindow.setAlwaysOnTop(true);
    setTimeout(() => {
      mainWindow?.setAlwaysOnTop(false);
    }, 1200);
  });

  setTimeout(() => {
    if (!mainWindow) {
      return;
    }
    mainWindow.show();
    mainWindow.focus();
    mainWindow.moveTop();
  }, 900);

  mainWindow.webContents.on("did-fail-load", (_event, code, description) => {
    console.error(`TIMBA renderer failed to load: ${code} ${description}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
