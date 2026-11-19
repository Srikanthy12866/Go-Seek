const path = require('node:path');
const os = require('node:os');
const { log } = require('./platform.cjs');

log('main.cjs started. Node: ' + process.version + ', Platform: ' + process.platform);

process.on('uncaughtException', (err) => {
  log('Uncaught Exception: ' + (err?.stack || err));
});
process.on('unhandledRejection', (reason) => {
  log('Unhandled Rejection: ' + (reason?.stack || reason));
});

const electronApi = require('electron');
if (typeof electronApi === 'string') {
  log('Invoked in Node mode instead of Electron. Self-respawning as Electron...');
  const { spawn } = require('node:child_process');
  const cleanEnv = { ...process.env };
  delete cleanEnv.ELECTRON_RUN_AS_NODE;
  const child = spawn(electronApi, [path.join(__dirname, '..'), ...process.argv.slice(2)], {
    env: cleanEnv,
    stdio: 'ignore',
    windowsHide: false,
    detached: true,
  });
  child.unref();
  process.exit(0);
}

const { app, BrowserWindow, ipcMain, shell } = electronApi;

// Import segregated menu modules
const overviewMenu = require('./menus/overview.cjs');
const computeMenu = require('./menus/compute.cjs');
const applicationsMenu = require('./menus/applications.cjs');
const memoryMenu = require('./menus/memory.cjs');
const boardMenu = require('./menus/board.cjs');
const displayMenu = require('./menus/display.cjs');
const storageMenu = require('./menus/storage.cjs');
const connectivityMenu = require('./menus/connectivity.cjs');
const devicesMenu = require('./menus/devices.cjs');

async function getHardwareSnapshot() {
  const [
    overviewData,
    computeData,
    applicationsData,
    memoryData,
    boardData,
    displayData,
    storageData,
    connectivityData,
    devicesData,
  ] = await Promise.all([
    overviewMenu.getOverviewData(),
    computeMenu.getComputeData(),
    applicationsMenu.getApplicationsData(),
    memoryMenu.getMemoryData(),
    boardMenu.getBoardData(),
    displayMenu.getDisplayData(),
    storageMenu.getStorageData(),
    connectivityMenu.getConnectivityData(),
    devicesMenu.getDevicesData(),
  ]);

  return {
    runtime: 'desktop',
    capturedAt: overviewData.capturedAt,
    platform: overviewData.platform,
    operatingSystem: overviewData.operatingSystem,
    architecture: overviewData.architecture,
    soc: computeData.soc,
    cpu: computeData.cpu,
    cpuInventory: computeData.cpuInventory,
    bench: {
      singleThread: null,
      multiThread: null,
      referenceComparison: null,
      stressTest: null,
    },
    applicationsSupported: applicationsData.applicationsSupported,
    applications: applicationsData.applications,
    graphics: computeData.graphics,
    memory: memoryData.memory,
    system: boardData.system,
    mainboard: boardData.mainboard,
    bios: boardData.bios,
    display: displayData.display,
    storage: storageData.storage,
    storageIO: storageData.storageIO,
    network: connectivityData.network,
    networkTraffic: connectivityData.networkTraffic,
    usb: devicesData.usb,
    pci: devicesData.pci,
    battery: devicesData.battery,
    sensors: devicesData.sensors,
    staticTelemetry: {
      ...(boardData.staticTelemetry || {}),
      ...(displayData.staticTelemetry || {}),
      ...(devicesData.staticTelemetry || {}),
    },
    dynamicTelemetry: {
      ...(boardData.dynamicTelemetry || {}),
      ...(memoryData.dynamicTelemetry || {}),
      ...(storageData.dynamicTelemetry || {}),
      ...(connectivityData.dynamicTelemetry || {}),
      ...(devicesData.dynamicTelemetry || {}),
    },
  };
}

// Register Segregated Menu IPC Handlers
ipcMain.handle('device:get-overview', async () => {
  log('device:get-overview requested');
  return overviewMenu.getOverviewData();
});

ipcMain.handle('device:get-compute', async () => {
  log('device:get-compute requested');
  return computeMenu.getComputeData();
});

ipcMain.handle('device:get-applications', async () => {
  log('device:get-applications requested');
  return applicationsMenu.getApplicationsData();
});

ipcMain.handle('device:get-memory', async () => {
  log('device:get-memory requested');
  return memoryMenu.getMemoryData();
});

ipcMain.handle('device:get-board', async () => {
  log('device:get-board requested');
  return boardMenu.getBoardData();
});

ipcMain.handle('device:get-display', async () => {
  log('device:get-display requested');
  return displayMenu.getDisplayData();
});

ipcMain.handle('device:get-storage', async () => {
  log('device:get-storage requested');
  return storageMenu.getStorageData();
});

ipcMain.handle('device:get-connectivity', async () => {
  log('device:get-connectivity requested');
  return connectivityMenu.getConnectivityData();
});

ipcMain.handle('device:get-devices', async () => {
  log('device:get-devices requested');
  return devicesMenu.getDevicesData();
});

// Master snapshot IPC handler (aggregates all menus)
ipcMain.handle('device:get-hardware-snapshot', async () => {
  log('device:get-hardware-snapshot requested');
  return getHardwareSnapshot();
});

let mainWindow = null;

function createWindow() {
  log('createWindow called');
  const iconPath = path.join(__dirname, '..', 'mobile', 'assets', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#121516',
    title: 'Go Seek | Device Report',
    icon: iconPath,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    log('ready-to-show event fired');
    if (typeof mainWindow.restore === 'function') mainWindow.restore();
    mainWindow.center();
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    setTimeout(() => {
      if (mainWindow) mainWindow.setAlwaysOnTop(false);
    }, 300);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  const buildIndexPath = path.join(__dirname, '..', 'build', 'index.html');
  if (app.isPackaged) {
    log('Loading packaged file: ' + buildIndexPath);
    mainWindow.loadFile(buildIndexPath);
  } else if (process.env.ELECTRON_START_URL) {
    log('Loading start url: ' + process.env.ELECTRON_START_URL);
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    const http = require('node:http');
    let loaded = false;
    const fallbackToBuild = () => {
      if (loaded) return;
      loaded = true;
      if (require('node:fs').existsSync(buildIndexPath)) {
        log('Loading build index: ' + buildIndexPath);
        mainWindow.loadFile(buildIndexPath);
      } else {
        log('Fallback to localhost:3000');
        mainWindow.loadURL('http://localhost:3000');
      }
    };
    const req = http.get('http://127.0.0.1:3000', (res) => {
      if (!loaded && res.statusCode === 200) {
        loaded = true;
        log('Dev server running on 3000, loading URL');
        mainWindow.loadURL('http://127.0.0.1:3000');
      } else {
        fallbackToBuild();
      }
    });
    req.setTimeout(800, () => {
      req.destroy();
      fallbackToBuild();
    });
    req.on('error', () => {
      fallbackToBuild();
    });
  }

  mainWindow.webContents.on('did-finish-load', () => {
    log('Window webContents did-finish-load');
  });
  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    log(`Window webContents did-fail-load: ${code} - ${desc}`);
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log('Another instance already running. Exiting second instance.');
  app.quit();
} else {
  app.on('second-instance', () => {
    log('Second instance attempted. Focusing primary window.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.center();
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.focus();
      setTimeout(() => {
        if (mainWindow) mainWindow.setAlwaysOnTop(false);
      }, 300);
    }
  });

  app.whenReady().then(() => {
    log('app.whenReady resolved');
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  log('window-all-closed fired');
  if (process.platform !== 'darwin') app.quit();
});
