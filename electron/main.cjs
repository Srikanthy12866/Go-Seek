const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const systemInformation = require('systeminformation');

const execFileAsync = promisify(execFile);
let staticInventoryPromise;
let cpuInventoryPromise;
let cacheTopologyPromise;
let applicationSessionCache = new Map();

const desktopServiceNames = new Set([
  'at-spi-bus-launcher', 'at-spi2-registryd', 'dbus-daemon', 'dconf-service', 'gnome-keyring-daemon',
  'gnome-shell', 'gnome-session-binary', 'gnome-session', 'gnome-settings-daemon', 'gsd-xsettings',
  'ibus-daemon', 'kwin_wayland', 'kwin_x11', 'mutter', 'pipewire', 'pipewire-pulse', 'plasmashell',
  'pulseaudio', 'sway', 'systemd', 'waybar', 'wireplumber', 'xwayland', 'xorg',
  'xdg-desktop-portal', 'xdg-document-portal', 'xdg-permission-store',
]);

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

function pciSysfsAddress(busAddress) {
  const address = String(busAddress || '').trim().toLowerCase();
  if (/^[\da-f]{4}:[\da-f]{2}:[\da-f]{2}\.[0-7]$/.test(address)) return address;
  if (/^[\da-f]{2}:[\da-f]{2}\.[0-7]$/.test(address)) return `0000:${address}`;
  return null;
}

function decodeDisplayedCpuId(family, model) {
  const familyNumber = Number.parseInt(family, 10);
  const modelNumber = Number.parseInt(model, 10);
  if (!Number.isInteger(familyNumber) || familyNumber < 0 || !Number.isInteger(modelNumber) || modelNumber < 0) {
    return { extendedFamily: null, extendedModel: null, baseModel: null };
  }

  const usesExtendedModel = familyNumber === 6 || familyNumber >= 15;
  return {
    extendedFamily: familyNumber > 15 ? familyNumber - 15 : 0,
    extendedModel: usesExtendedModel ? modelNumber >> 4 : 0,
    baseModel: usesExtendedModel ? modelNumber & 0xF : modelNumber,
  };
}

function parseKernelCacheSize(value) {
  const match = String(value || '').trim().match(/^(\d+(?:\.\d+)?)\s*([KMG])?B?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] || '').toUpperCase();
  const multiplier = unit === 'G' ? 1024 ** 3 : unit === 'M' ? 1024 ** 2 : unit === 'K' ? 1024 : 1;
  return Number.isFinite(amount) ? Math.round(amount * multiplier) : null;
}

function parsePpDpmCurrentMhz(text) {
  const current = String(text || '').split('\n').find((line) => line.includes('*'));
  const mhz = Number(current?.match(/(\d+(?:\.\d+)?)\s*Mhz/i)?.[1]);
  return Number.isFinite(mhz) && mhz > 0 ? mhz : null;
}

async function readLinuxPciLink(busAddress) {
  const address = pciSysfsAddress(busAddress);
  if (process.platform !== 'linux' || !address) return null;

  const directory = path.join('/sys/bus/pci/devices', address);
  const [currentSpeed, currentWidth, maxSpeed, maxWidth] = await Promise.all([
    'current_link_speed', 'current_link_width', 'max_link_speed', 'max_link_width',
  ].map((file) => readSafely(() => fs.readFile(path.join(directory, file), 'utf8').then((value) => value.trim()), null)));

  return { currentSpeed, currentWidth, maxSpeed, maxWidth };
}

async function readLinuxBootMode() {
  if (process.platform !== 'linux') return null;
  return readSafely(() => fs.access('/sys/firmware/efi').then(() => 'UEFI'), 'Legacy BIOS / UEFI interface unavailable');
}

async function readLinuxCpuInventory() {
  if (process.platform !== 'linux') return {};
  if (!cpuInventoryPromise) {
    cpuInventoryPromise = (async () => {
      const result = await readSafely(() => execFileAsync('lscpu', ['--json'], {
        encoding: 'utf8',
        timeout: 3000,
        maxBuffer: 256 * 1024,
      }), null);
      if (!result?.stdout) return {};

      const rows = await readSafely(() => JSON.parse(result.stdout).lscpu || [], []);
      const values = new Map(rows.map(({ field, data }) => [field.replace(/:$/, '').trim(), String(data || '').trim()]));
      const number = (field) => {
        const parsed = Number.parseFloat((values.get(field) || '').replace(/,/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
      };

      return {
        architecture: values.get('Architecture') || null,
        operationModes: values.get('CPU op-mode(s)') || null,
        byteOrder: values.get('Byte Order') || null,
        vendorId: values.get('Vendor ID') || null,
        family: values.get('CPU family') || null,
        model: values.get('Model') || null,
        stepping: values.get('Stepping') || null,
        currentMhz: number('CPU MHz'),
        minimumMhz: number('CPU min MHz'),
        maximumMhz: number('CPU max MHz'),
        bogoMips: number('BogoMIPS'),
        virtualization: values.get('Virtualization') || null,
        hypervisorVendor: values.get('Hypervisor vendor') || null,
        threadsPerCore: number('Thread(s) per core'),
        coresPerSocket: number('Core(s) per socket'),
        sockets: number('Socket(s)'),
        numaNodes: number('NUMA node(s)'),
        caches: {
          l1d: values.get('L1d cache') || null,
          l1i: values.get('L1i cache') || null,
          l2: values.get('L2 cache') || null,
          l3: values.get('L3 cache') || null,
        },
        flags: values.get('Flags')?.split(/\s+/).filter(Boolean) || [],
        numaCpuMap: rows.filter(({ field }) => /^NUMA node\d+ CPU\(s\):?$/.test(field.trim())).map(({ field, data }) => ({
          node: field.match(/\d+/)?.[0] ?? null,
          cpus: String(data || '').trim(),
        })),
      };
    })();
  }

  return cpuInventoryPromise;
}

async function readLinuxCacheTopology() {
  if (process.platform !== 'linux') return [];
  if (!cacheTopologyPromise) {
    cacheTopologyPromise = (async () => {
      const cpuNames = await readSafely(() => fs.readdir('/sys/devices/system/cpu'), []);
      const instances = new Map();

      for (const cpuName of cpuNames.filter((name) => /^cpu\d+$/.test(name))) {
        const cacheDirectory = path.join('/sys/devices/system/cpu', cpuName, 'cache');
        const indexes = await readSafely(() => fs.readdir(cacheDirectory), []);
        for (const index of indexes.filter((name) => /^index\d+$/.test(name))) {
          const directory = path.join(cacheDirectory, index);
          const readText = (file) => readSafely(() => fs.readFile(path.join(directory, file), 'utf8').then((value) => value.trim()), null);
          const [level, type, size, ways, lineSize, sets, sharedCpuList] = await Promise.all([
            readText('level'), readText('type'), readText('size'), readText('ways_of_associativity'),
            readText('coherency_line_size'), readText('number_of_sets'), readText('shared_cpu_list'),
          ]);
          const key = `${level}|${type}|${sharedCpuList}`;
          if (!level || !type || instances.has(key)) continue;
          instances.set(key, {
            level: Number(level),
            type,
            sizeBytes: parseKernelCacheSize(size),
            ways: Number(ways) || null,
            lineSizeBytes: Number(lineSize) || null,
            sets: Number(sets) || null,
            sharedCpuList: sharedCpuList || null,
          });
        }
      }

      return [...instances.values()].sort((left, right) => left.level - right.level || String(left.type).localeCompare(String(right.type)) || String(left.sharedCpuList).localeCompare(String(right.sharedCpuList)));
    })();
  }

  return cacheTopologyPromise;
}

async function readLinuxGpuClocks() {
  if (process.platform !== 'linux') return new Map();

  const cards = (await readSafely(() => fs.readdir('/sys/class/drm'), [])).filter((name) => /^card\d+$/.test(name));
  const clocks = new Map();
  await Promise.all(cards.map(async (card) => {
    const devicePath = path.join('/sys/class/drm', card, 'device');
    const uevent = await readSafely(() => fs.readFile(path.join(devicePath, 'uevent'), 'utf8'), '');
    const slot = uevent.match(/^PCI_SLOT_NAME=(.+)$/m)?.[1]?.trim();
    let core = await readSafely(() => fs.readFile(path.join('/sys/class/drm', card, 'gt/gt0/rps_cur_freq_mhz'), 'utf8').then((value) => Number(value.trim())), null);
    if (!Number.isFinite(core) || core <= 0) core = parsePpDpmCurrentMhz(await readSafely(() => fs.readFile(path.join(devicePath, 'pp_dpm_sclk'), 'utf8'), ''));
    const memory = parsePpDpmCurrentMhz(await readSafely(() => fs.readFile(path.join(devicePath, 'pp_dpm_mclk'), 'utf8'), ''));
    if ((!Number.isFinite(core) || core <= 0) && !memory) return;

    const reading = { core: Number.isFinite(core) && core > 0 ? core : null, memory };
    const address = pciSysfsAddress(slot);
    if (!address) return;
    clocks.set(address, reading);
    clocks.set(address.replace(/^[\da-f]{4}:/, ''), reading);
  }));
  return clocks;
}

async function readLinuxApplications() {
  if (process.platform !== 'linux') return [];

  const processSnapshot = await readSafely(() => systemInformation.processes(), { list: [] });
  const currentUser = os.userInfo().username;
  const processList = processSnapshot.list || [];
  const goSeekProcessTree = new Set([process.pid]);
  let foundChild;

  do {
    foundChild = false;
    for (const item of processList) {
      if (goSeekProcessTree.has(item.parentPid) && !goSeekProcessTree.has(item.pid)) {
        goSeekProcessTree.add(item.pid);
        foundChild = true;
      }
    }
  } while (foundChild);

  const candidates = processList.filter((item) => {
    const name = String(item.name || '').toLowerCase();
    return item.user === currentUser &&
      !goSeekProcessTree.has(item.pid) &&
      item.state !== 'zombie' &&
      name &&
      !desktopServiceNames.has(name) &&
      !name.startsWith('gsd-') &&
      !['bash', 'dash', 'fish', 'sh', 'zsh'].includes(name);
  });
  const currentSession = new Map();
  const applications = await Promise.all(candidates.map(async (item) => {
    const sessionKey = `${item.pid}:${item.started || ''}`;
    let isGraphicalApplication = applicationSessionCache.get(sessionKey);

    if (isGraphicalApplication === undefined) {
      const environment = await readSafely(() => fs.readFile(`/proc/${item.pid}/environ`), Buffer.alloc(0));
      const entries = environment.toString().split('\0');
      isGraphicalApplication = entries.some((entry) => /^(?:DISPLAY|WAYLAND_DISPLAY|FLATPAK_ID|SNAP_NAME|APPIMAGE)=.+$/.test(entry));
    }

    currentSession.set(sessionKey, isGraphicalApplication);
    if (!isGraphicalApplication) return null;

    return {
      pid: item.pid,
      name: item.name,
      cpuPercent: Number.isFinite(item.cpu) ? item.cpu : null,
      memoryPercent: Number.isFinite(item.mem) ? item.mem : null,
      residentBytes: Number.isFinite(item.memRss) ? item.memRss * 1024 : null,
      state: item.state || null,
      started: item.started || null,
      childProcessCount: processList.filter((child) => child.parentPid === item.pid).length,
    };
  }));

  applicationSessionCache = currentSession;
  return applications.filter(Boolean).sort((left, right) => (right.cpuPercent || 0) - (left.cpuPercent || 0)).slice(0, 100);
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
  const [cpu, currentSpeed, currentLoad, temperature, memory, memoryLayout, graphics, system, baseboard, bios, osInfo, inventory, networkStats, battery, fanSpeeds, cpuInfo, filesystems, storageIO, bootMode, cpuInventory, cacheTopology, gpuClocks, applications] = await Promise.all([
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
    readLinuxBootMode(),
    readLinuxCpuInventory(),
    readLinuxCacheTopology(),
    readLinuxGpuClocks(),
    readLinuxApplications(),
  ]);
  const microcodeRevision = cpuInfo.match(/^microcode\s*:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const cpuId = decodeDisplayedCpuId(cpu.family, cpu.model);
  const hostBridges = (inventory.pci || []).filter((device) => ['0x060000', '0x060100'].includes(String(device.classCode).toLowerCase()));

  return {
    runtime: 'desktop',
    capturedAt: Date.now(),
    platform: process.platform,
    operatingSystem: `${osInfo.distro || osInfo.platform || os.type()} ${osInfo.release || os.release()}`,
    architecture: os.arch(),
    soc: {
      name: cpu.brand || 'Not reported by OS',
      codeName: null,
      manufacturer: cpu.manufacturer || 'Not reported',
      processNode: null,
      maxTdpWatts: null,
      family: cpu.family || 'Not reported',
      model: cpu.model || 'Not reported',
      stepping: cpu.stepping || 'Not reported',
      extendedFamily: cpuId.extendedFamily,
      extendedModel: cpuId.extendedModel,
      baseModel: cpuId.baseModel,
      revision: cpu.revision ?? null,
      socket: cpu.socket || 'Not reported',
      voltage: cpu.voltage || null,
      multiplier: null,
      busSpeedMhz: null,
      platformLink: null,
      minimumSpeedGhz: cpu.speedMin ?? null,
      governor: cpu.governor || null,
      instructions: typeof cpu.flags === 'string' ? cpu.flags.trim().split(/\s+/).filter(Boolean) : [],
    },
    cpu: {
      logicalCores: cpu.cores ?? os.cpus().length,
      physicalCores: cpu.physicalCores ?? null,
      performanceCores: cpu.performanceCores ?? null,
      efficiencyCores: cpu.efficiencyCores ?? null,
      architecture: `${cpu.family || 'Family n/a'} / ${cpu.model || 'Model n/a'}`,
      maxSpeedGhz: cpu.speedMax ?? null,
      minSpeedGhz: cpu.speedMin ?? null,
      governor: cpu.governor || null,
      current: currentSpeed.cores || [],
      averageSpeedGhz: currentSpeed.avg ?? null,
      utilizationPercent: currentLoad.currentLoad ?? null,
      perCoreUtilizationPercent: (currentLoad.cpus || []).map((core) => core.load ?? null),
      caches: cpu.cache || {},
      cacheInstances: cacheTopology,
      temperatureC: temperature.main ?? null,
      perCoreTemperatureC: temperature.cores || [],
      microcodeRevision,
    },
    cpuInventory,
    bench: {
      singleThread: null,
      multiThread: null,
      referenceComparison: null,
      stressTest: null,
    },
    applicationsSupported: process.platform === 'linux',
    applications,
    graphics: await Promise.all((graphics.controllers || []).map(async (controller) => {
      const address = pciSysfsAddress(controller.busAddress);
      const clocks = gpuClocks.get(address) || gpuClocks.get(String(controller.busAddress || '').trim().toLowerCase()) || {};
      return {
        ...pick(controller, [
          'vendor', 'subVendor', 'model', 'name', 'bus', 'busAddress', 'pciID', 'vram', 'vramDynamic', 'driverVersion',
          'utilizationGpu', 'temperatureGpu',
        ]),
        clockCore: controller.clockCore || clocks.core || null,
        clockMemory: controller.clockMemory || clocks.memory || null,
        codeName: null,
        technology: null,
        dieSize: null,
        releaseDate: null,
        transistorCount: null,
        shaders: null,
        tmus: null,
        rops: null,
        memoryType: null,
        memoryBusWidthBits: null,
        shaderClockMhz: null,
        biosVersion: null,
        pciLink: await readLinuxPciLink(controller.busAddress),
      };
    })),
    memory: {
      totalBytes: memory.total ?? null,
      availableBytes: memory.available ?? null,
      channelMode: null,
      dramFrequencyMhz: null,
      nbFrequencyMhz: null,
      fsbDram: null,
      uncoreFrequencyMhz: null,
      timings: { cl: null, trcd: null, trp: null, tras: null, trc: null, commandRate: null },
      modules: (memoryLayout || []).map((module) => ({
        ...pick(module, [
          'size', 'type', 'clockSpeed', 'formFactor', 'bank', 'manufacturer', 'partNum', 'ecc',
          'voltageConfigured', 'voltageMin', 'voltageMax', 'serialNum',
        ]),
        maxBandwidth: null,
        ranks: null,
        manufactureWeek: null,
        manufactureYear: null,
        dramManufacturer: null,
        jedecTimings: null,
        xmpProfiles: null,
      })),
    },
    system: pick(system, ['manufacturer', 'model', 'version', 'sku', 'virtual', 'virtualHost']),
    mainboard: {
      ...pick(baseboard, ['manufacturer', 'model', 'version', 'memMax', 'memSlots']),
      chipset: null,
      southbridge: null,
      lpcio: null,
      hostBridges,
    },
    bios: {
      ...pick(bios, ['vendor', 'version', 'releaseDate', 'revision', 'language']),
      bootMode,
    },
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