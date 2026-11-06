const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const systemInformation = require('systeminformation');

let staticInventoryPromise;

const readSafely = async (reader, fallback = null) => {
  try {
    return await reader();
  } catch (error) {
    return fallback;
  }
};

const pick = (source, keys) => Object.fromEntries(
  keys.map((key) => [key, source?.[key] ?? null])
);

async function readLinuxPciDevices() {
  if (process.platform !== 'linux') return [];

  const devices = await readSafely(() => fs.readdir('/sys/bus/pci/devices'), []);
  return Promise.all(devices.map(async (device) => {
    const directory = path.join('/sys/bus/pci/devices', device);
    const [classCode, vendorId, deviceId, subsystemVendorId, subsystemDeviceId] = await Promise.all([
      'class', 'vendor', 'device', 'subsystem_vendor', 'subsystem_device',
    ].map((file) => readSafely(() => fs.readFile(path.join(directory, file), 'utf8').then((value) => value.trim()), null)));

    return { classCode, vendorId, deviceId, subsystemVendorId, subsystemDeviceId };
  }));
}

async function readLinuxFanSpeeds() {
  if (process.platform !== 'linux') return [];

  const controllers = await readSafely(() => fs.readdir('/sys/class/hwmon'), []);
  const readings = await Promise.all(controllers.map(async (controller) => {
    const directory = path.join('/sys/class/hwmon', controller);
    const [name, files] = await Promise.all([
      readSafely(() => fs.readFile(path.join(directory, 'name'), 'utf8').then((value) => value.trim()), null),
      readSafely(() => fs.readdir(directory), []),
    ]);
    const fanFiles = files.filter((file) => /^fan\d+_input$/.test(file));
    return Promise.all(fanFiles.map(async (file) => {
      const number = file.match(/\d+/)?.[0];
      const [rpm, label] = await Promise.all([
        readSafely(() => fs.readFile(path.join(directory, file), 'utf8').then((value) => Number(value.trim())), null),
        readSafely(() => fs.readFile(path.join(directory, `fan${number}_label`), 'utf8').then((value) => value.trim()), null),
      ]);
      return Number.isFinite(rpm) ? { controller: name, label, rpm } : null;
    }));
  }));

  return readings.flat().filter(Boolean).slice(0, 32);
}

async function getStaticInventory() {
  if (!staticInventoryPromise) {
    staticInventoryPromise = (async () => {
      const [diskLayout, blockDevices, networkInterfaces, usbDevices, pciDevices] = await Promise.all([
        readSafely(() => systemInformation.diskLayout(), []),
        readSafely(() => systemInformation.blockDevices(), []),
        readSafely(() => systemInformation.networkInterfaces(), []),
        readSafely(() => systemInformation.usb(), []),
        readLinuxPciDevices(),
      ]);

      return {
        storage: {
          disks: diskLayout.map((disk) => pick(disk, [
            'name', 'vendor', 'type', 'size', 'firmwareRevision', 'interfaceType', 'smartStatus', 'temperature',
          ])),
          devices: blockDevices.filter((device) => device.physical).map((device) => pick(device, [
            'model', 'type', 'size', 'physical', 'protocol', 'removable',
          ])),
        },
        network: networkInterfaces.map((network) => pick(network, [
          'type', 'default', 'operstate', 'duplex', 'speed', 'mtu', 'internal', 'virtual',
        ])),
        usb: usbDevices.map((device) => pick(device, [
          'bus', 'name', 'type', 'manufacturer', 'vendor', 'removable', 'maxPower',
        ])),
        pci: pciDevices.filter((device) => device.vendorId || device.deviceId),
      };
    })();
  }

  return staticInventoryPromise;
}

async function getHardwareSnapshot() {
  const [cpu, currentSpeed, currentLoad, temperature, memory, memoryLayout, graphics, system, baseboard, bios, osInfo, inventory, networkStats, battery, fanSpeeds, cpuInfo, filesystems, storageIO] = await Promise.all([
    readSafely(() => systemInformation.cpu(), {}),
    readSafely(() => systemInformation.cpuCurrentSpeed(), {}),
    readSafely(() => systemInformation.currentLoad(), {}),
    readSafely(() => systemInformation.cpuTemperature(), {}),
    readSafely(() => systemInformation.mem(), {}),
    readSafely(() => systemInformation.memLayout(), []),
    readSafely(() => systemInformation.graphics(), { controllers: [], displays: [] }),
    readSafely(() => systemInformation.system(), {}),
    readSafely(() => systemInformation.baseboard(), {}),
    readSafely(() => systemInformation.bios(), {}),
    readSafely(() => systemInformation.osInfo(), {}),
    getStaticInventory(),
    readSafely(() => systemInformation.networkStats(), []),
    readSafely(() => systemInformation.battery(), {}),
    readLinuxFanSpeeds(),
    process.platform === 'linux'
      ? readSafely(() => fs.readFile('/proc/cpuinfo', 'utf8'), '')
      : Promise.resolve(''),
    readSafely(() => systemInformation.fsSize(), []),
    readSafely(() => systemInformation.fsStats(), {}),
  ]);
  const microcodeRevision = cpuInfo.match(/^microcode\s*:\s*(.+)$/m)?.[1]?.trim() ?? null;

  return {
    runtime: 'desktop',
    capturedAt: Date.now(),
    platform: process.platform,
    operatingSystem: `${osInfo.distro || osInfo.platform || os.type()} ${osInfo.release || os.release()}`,
    architecture: os.arch(),
    soc: {
      name: cpu.brand || 'Not reported by OS',
      manufacturer: cpu.manufacturer || 'Not reported',
      processNode: 'Not exposed by standard host APIs',
      family: cpu.family || 'Not reported',
      model: cpu.model || 'Not reported',
      stepping: cpu.stepping || 'Not reported',
      socket: cpu.socket || 'Not reported',
    },
    cpu: {
      logicalCores: cpu.cores ?? os.cpus().length,
      physicalCores: cpu.physicalCores ?? null,
      performanceCores: cpu.performanceCores ?? null,
      efficiencyCores: cpu.efficiencyCores ?? null,
      architecture: `${cpu.family || 'Family n/a'} / ${cpu.model || 'Model n/a'}`,
      maxSpeedGhz: cpu.speedMax ?? null,
      current: currentSpeed.cores || [],
      averageSpeedGhz: currentSpeed.avg ?? null,
      utilizationPercent: currentLoad.currentLoad ?? null,
      perCoreUtilizationPercent: (currentLoad.cpus || []).map((core) => core.load ?? null),
      caches: cpu.cache || {},
      temperatureC: temperature.main ?? null,
      perCoreTemperatureC: temperature.cores || [],
      microcodeRevision,
    },
    graphics: (graphics.controllers || []).map((controller) => pick(controller, [
      'vendor', 'model', 'name', 'bus', 'vram', 'vramDynamic', 'driverVersion',
      'clockCore', 'clockMemory', 'utilizationGpu', 'temperatureGpu',
    ])),
    memory: {
      totalBytes: memory.total ?? null,
      availableBytes: memory.available ?? null,
      modules: (memoryLayout || []).map((module) => pick(module, [
        'size', 'type', 'clockSpeed', 'formFactor', 'manufacturer', 'partNum', 'ecc',
      ])),
    },
    system: pick(system, ['manufacturer', 'model', 'version', 'sku', 'virtual', 'virtualHost']),
    mainboard: pick(baseboard, ['manufacturer', 'model', 'version', 'memMax', 'memSlots']),
    bios: pick(bios, ['vendor', 'version', 'releaseDate', 'revision', 'language']),
    display: (graphics.displays || []).map((display) => pick(display, [
      'model', 'main', 'builtin', 'connection', 'resolutionX', 'resolutionY', 'currentRefreshRate', 'pixelDepth',
    ])),
    ...inventory,
    storage: {
      ...inventory.storage,
      filesystems: filesystems.map((filesystem) => pick(filesystem, [
        'type', 'size', 'used', 'available', 'use', 'rw',
      ])),
    },
    storageIO: {
      readBytesPerSecond: storageIO.rx_sec ?? null,
      writeBytesPerSecond: storageIO.wx_sec ?? null,
    },
    networkTraffic: networkStats.map((stats) => pick(stats, ['operstate', 'rx_sec', 'tx_sec'])),
    battery: pick(battery, [
      'hasBattery', 'isCharging', 'designedCapacity', 'maxCapacity', 'currentCapacity', 'capacityUnit', 'voltage', 'percent', 'timeRemaining', 'acConnected',
    ]),
    sensors: {
      fans: fanSpeeds,
    },
  };
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#f7f8f3',
    title: 'Go Seek | Device Report',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (app.isPackaged) {
    window.loadFile(path.join(__dirname, '..', 'build', 'index.html'));
  } else {
    window.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:3000');
  }
}

ipcMain.handle('device:get-hardware-snapshot', getHardwareSnapshot);

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});