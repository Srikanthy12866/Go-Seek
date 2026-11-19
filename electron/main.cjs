const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const syncFs = require('node:fs');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const logFile = path.join(__dirname, '..', 'electron-run.log');
function log(msg) {
  try { syncFs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`); } catch (_) {}
}
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
    const [classCode, vendorId, deviceId, subsystemVendorId, subsystemDeviceId, aerCorrectable, aerNonFatal, aerFatal, powerControl, runtimeStatus, linkSpeed, linkWidth] = await Promise.all([
      'class', 'vendor', 'device', 'subsystem_vendor', 'subsystem_device',
      'aer_dev_correctable', 'aer_dev_nonfatal', 'aer_dev_fatal',
      'power/control', 'power/runtime_status', 'current_link_speed', 'current_link_width',
    ].map((file) => readSafely(() => fs.readFile(path.join(directory, file), 'utf8').then((value) => value.trim()), null)));

    return {
      address: device,
      classCode, vendorId, deviceId, subsystemVendorId, subsystemDeviceId,
      aerCorrectable, aerNonFatal, aerFatal, powerControl, runtimeStatus, linkSpeed, linkWidth,
    };
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
      const [rpm, label, pwm] = await Promise.all([
        readSafely(() => fs.readFile(path.join(directory, file), 'utf8').then((value) => Number(value.trim())), null),
        readSafely(() => fs.readFile(path.join(directory, `fan${number}_label`), 'utf8').then((value) => value.trim()), null),
        readSafely(() => fs.readFile(path.join(directory, `pwm${number}`), 'utf8').then((value) => Number(value.trim())), null),
      ]);
      return Number.isFinite(rpm) ? { controller: name, label, rpm, pwmDutyPercent: Number.isFinite(pwm) ? Math.round((pwm / 255) * 100) : null } : null;
    }));
  }));

  return readings.flat().filter(Boolean).slice(0, 32);
}

async function readLinuxStaticTelemetry() {
  if (process.platform !== 'linux') return {};

  const [
    deviceTreeModel, deviceTreeCompatible, secureBoot, tpmVersion, tpmPcrBanks,
    ipmiPresent, acpiTables, chassisType, boardAssetTag, wakeupText,
    drmConnectors, backlights, audioCardsText, audioCodecs,
    usbRootHubs, usbDevSpeeds, thunderboltDevs, cxlDevs, iommuGroups,
    i2cDevs, spiDevs, spiMasters, ttyDevs, gpioDevs, watchdogDevs,
    clocksourceCur, clocksourceAvail, rtcInfo, pwmChips, canIfaces, dmaText, iioDevs,
    accelDevs, migCaps, msrAccess,
  ] = await Promise.all([
    readSafely(() => fs.readFile('/sys/firmware/devicetree/base/model', 'utf8').then((v) => v.replace(/\0/g, '').trim()), null),
    readSafely(() => fs.readFile('/sys/firmware/devicetree/base/compatible', 'utf8').then((v) => v.replace(/\0/g, ' ').trim()), null),
    readSafely(async () => {
      const vars = await fs.readdir('/sys/firmware/efi/efivars');
      const sbVar = vars.find((f) => f.startsWith('SecureBoot-'));
      if (!sbVar) return 'EFI variables present (SecureBoot variable not found)';
      const buf = await readSafely(() => fs.readFile(path.join('/sys/firmware/efi/efivars', sbVar)), null);
      if (!buf || buf.length < 5) return 'UEFI SecureBoot variable unreadable';
      return buf[4] === 1 ? 'Enabled' : 'Disabled';
    }, null),
    readSafely(() => fs.readFile('/sys/class/tpm/tpm0/tpm_version_major', 'utf8').then((v) => `TPM ${v.trim()}.0`), null),
    readSafely(async () => {
      const entries = await fs.readdir('/sys/class/tpm/tpm0');
      return entries.filter((e) => e.startsWith('pcr-'));
    }, []),
    readSafely(() => fs.access('/dev/ipmi0').then(() => 'Present (/dev/ipmi0)'), null),
    readSafely(async () => {
      const entries = await fs.readdir('/sys/firmware/acpi/tables');
      return entries.filter((e) => !['data', 'dynamic'].includes(e));
    }, []),
    readSafely(() => fs.readFile('/sys/devices/virtual/dmi/id/chassis_type', 'utf8').then((v) => v.trim()), null),
    readSafely(() => fs.readFile('/sys/devices/virtual/dmi/id/board_asset_tag', 'utf8').then((v) => v.trim()), null),
    readSafely(() => fs.readFile('/proc/acpi/wakeup', 'utf8'), ''),
    readSafely(async () => {
      const entries = (await fs.readdir('/sys/class/drm')).filter((n) => /^card\d+-/.test(n));
      return Promise.all(entries.map(async (conn) => {
        const dir = path.join('/sys/class/drm', conn);
        const [status, enabled, modesText, edidBuf] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'status'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'enabled'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'modes'), 'utf8').then((v) => v.trim().split('\n').filter(Boolean)), []),
          readSafely(() => fs.readFile(path.join(dir, 'edid')), null),
        ]);
        return { connector: conn, status, enabled, nativeMode: modesText[0] || null, edidBytes: edidBuf ? edidBuf.length : 0 };
      }));
    }, []),
    readSafely(async () => {
      const entries = await fs.readdir('/sys/class/backlight');
      return Promise.all(entries.map(async (bl) => {
        const dir = path.join('/sys/class/backlight', bl);
        const [actual, max] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'actual_brightness'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'max_brightness'), 'utf8').then((v) => Number(v.trim())), null),
        ]);
        return { name: bl, actual, max };
      }));
    }, []),
    readSafely(() => fs.readFile('/proc/asound/cards', 'utf8'), ''),
    readSafely(async () => {
      const cards = (await fs.readdir('/proc/asound')).filter((n) => /^card\d+$/.test(n));
      const codecs = [];
      for (const card of cards) {
        const files = (await readSafely(() => fs.readdir(path.join('/proc/asound', card)), [])).filter((f) => f.startsWith('codec#'));
        for (const file of files) {
          const text = await readSafely(() => fs.readFile(path.join('/proc/asound', card, file), 'utf8'), '');
          const codec = text.match(/^Codec:\s*(.+)$/m)?.[1]?.trim();
          const vendorId = text.match(/^Vendor Id:\s*(.+)$/m)?.[1]?.trim();
          const subsystemId = text.match(/^Subsystem Id:\s*(.+)$/m)?.[1]?.trim();
          if (codec) codecs.push({ card, codec, vendorId, subsystemId });
        }
      }
      return codecs;
    }, []),
    readSafely(async () => {
      const entries = (await fs.readdir('/sys/bus/usb/devices')).filter((n) => /^usb\d+$/.test(n));
      return Promise.all(entries.map(async (bus) => {
        const dir = path.join('/sys/bus/usb/devices', bus);
        const [speed, version, product] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'speed'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'version'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'product'), 'utf8').then((v) => v.trim()), null),
        ]);
        return { bus, speedMbps: speed, version, product };
      }));
    }, []),
    readSafely(async () => {
      const entries = (await fs.readdir('/sys/bus/usb/devices')).filter((n) => /^\d+-[\d.]+$/.test(n));
      return Promise.all(entries.slice(0, 24).map(async (id) => {
        const dir = path.join('/sys/bus/usb/devices', id);
        const [speed, maxPower, product] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'speed'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'bMaxPower'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'product'), 'utf8').then((v) => v.trim()), null),
        ]);
        return { id, speedMbps: speed, maxPower, product };
      }));
    }, []),
    readSafely(() => fs.readdir('/sys/bus/thunderbolt/devices'), []),
    readSafely(() => fs.readdir('/sys/bus/cxl/devices'), []),
    readSafely(() => fs.readdir('/sys/kernel/iommu_groups'), []),
    readSafely(() => fs.readdir('/sys/bus/i2c/devices'), []),
    readSafely(() => fs.readdir('/sys/bus/spi/devices'), []),
    readSafely(() => fs.readdir('/sys/class/spi_master'), []),
    readSafely(async () => {
      const ttys = await fs.readdir('/sys/class/tty');
      return ttys.filter((t) => /^tty(S|USB|AMA|ACM)\d+$/.test(t)).slice(0, 16);
    }, []),
    readSafely(() => fs.readdir('/sys/bus/gpio/devices'), []),
    readSafely(async () => {
      const wds = await fs.readdir('/sys/class/watchdog');
      return Promise.all(wds.map(async (w) => {
        const dir = path.join('/sys/class/watchdog', w);
        const [identity, state, timeout] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'identity'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'state'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'timeout'), 'utf8').then((v) => v.trim()), null),
        ]);
        return { name: w, identity, state, timeoutSec: timeout };
      }));
    }, []),
    readSafely(() => fs.readFile('/sys/devices/system/clocksource/clocksource0/current_clocksource', 'utf8').then((v) => v.trim()), null),
    readSafely(() => fs.readFile('/sys/devices/system/clocksource/clocksource0/available_clocksource', 'utf8').then((v) => v.trim()), null),
    readSafely(async () => {
      const [name, date, time, wakealarm] = await Promise.all([
        readSafely(() => fs.readFile('/sys/class/rtc/rtc0/name', 'utf8').then((v) => v.trim()), null),
        readSafely(() => fs.readFile('/sys/class/rtc/rtc0/date', 'utf8').then((v) => v.trim()), null),
        readSafely(() => fs.readFile('/sys/class/rtc/rtc0/time', 'utf8').then((v) => v.trim()), null),
        readSafely(() => fs.readFile('/sys/class/rtc/rtc0/wakealarm', 'utf8').then((v) => v.trim()), null),
      ]);
      return name ? { name, date, time, wakealarm: wakealarm || 'None' } : null;
    }, null),
    readSafely(() => fs.readdir('/sys/class/pwm'), []),
    readSafely(async () => {
      const nets = await fs.readdir('/sys/class/net');
      return nets.filter((n) => /^can\d+$/.test(n));
    }, []),
    readSafely(() => fs.readFile('/proc/dma', 'utf8').then((v) => v.trim().split('\n').map((l) => l.trim()).filter(Boolean)), []),
    readSafely(async () => {
      const devs = await fs.readdir('/sys/bus/iio/devices');
      return Promise.all(devs.filter((d) => d.startsWith('iio:device')).map(async (d) => {
        const dir = path.join('/sys/bus/iio/devices', d);
        const [name, files] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'name'), 'utf8').then((v) => v.trim()), d),
          readSafely(() => fs.readdir(dir), []),
        ]);
        return { device: d, name, channels: files.filter((f) => f.startsWith('in_')).slice(0, 8) };
      }));
    }, []),
    readSafely(() => fs.readdir('/sys/class/accel'), []),
    readSafely(() => fs.readdir('/dev/nvidia-caps'), []),
    readSafely(() => fs.access('/dev/cpu/0/msr').then(() => 'Present (/dev/cpu/0/msr)'), null),
  ]);

  const enabledWakeDevices = wakeupText
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.includes('*enabled'))
    .map((line) => line.split(/\s+/)[0]);

  return {
    kernelRelease: os.release(),
    deviceTreeModel,
    deviceTreeCompatible,
    secureBoot,
    tpmVersion,
    tpmPcrBanks,
    ipmiPresent,
    acpiTables,
    chassisType,
    boardAssetTag,
    wakeupSources: enabledWakeDevices,
    drmConnectors,
    backlights,
    audioCards: audioCardsText.trim().split('\n').map((l) => l.trim()).filter(Boolean),
    audioCodecs,
    usbRootHubs,
    usbDevSpeeds,
    thunderboltDevs,
    cxlDevs,
    iommuGroupCount: iommuGroups.length,
    i2cBuses: i2cDevs,
    spiDevices: spiDevs,
    spiMasters,
    uartPorts: ttyDevs,
    gpioChips: gpioDevs,
    watchdogDevs,
    clocksourceCurrent: clocksourceCur,
    clocksourceAvailable: clocksourceAvail,
    rtcInfo,
    pwmChips,
    canInterfaces: canIfaces,
    dmaChannels: dmaText,
    iioSensors: iioDevs,
    npuAccelerators: accelDevs,
    migSlices: migCaps,
    msrAccess,
  };
}

async function readLinuxDynamicTelemetry() {
  if (process.platform !== 'linux') return {};

  const [
    cpuidleStates, raplPkgUj, raplDramUj, coreThrottle, pkgThrottle,
    thermalZones, coolingDevices, hwmonVoltages, powerSupplies,
    numaNodes, thpEnabled, meminfoText, interruptsText, edacControllers,
    blockQueues, nvmeControllers, netExtended, gpuHwmon,
  ] = await Promise.all([
    readSafely(async () => {
      const states = (await fs.readdir('/sys/devices/system/cpu/cpu0/cpuidle')).filter((s) => /^state\d+$/.test(s));
      return Promise.all(states.map(async (s) => {
        const dir = path.join('/sys/devices/system/cpu/cpu0/cpuidle', s);
        const [name, latency, time] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'name'), 'utf8').then((v) => v.trim()), s),
          readSafely(() => fs.readFile(path.join(dir, 'latency'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'time'), 'utf8').then((v) => Number(v.trim())), null),
        ]);
        return { name, latencyUs: latency, residencyUs: time };
      }));
    }, []),
    readSafely(() => fs.readFile('/sys/class/powercap/intel-rapl/intel-rapl:0/energy_uj', 'utf8').then((v) => Number(v.trim())), null),
    readSafely(() => fs.readFile('/sys/class/powercap/intel-rapl/intel-rapl:0:0/energy_uj', 'utf8').then((v) => Number(v.trim())), null),
    readSafely(() => fs.readFile('/sys/devices/system/cpu/cpu0/thermal_throttle/core_throttle_count', 'utf8').then((v) => Number(v.trim())), null),
    readSafely(() => fs.readFile('/sys/devices/system/cpu/cpu0/thermal_throttle/package_throttle_count', 'utf8').then((v) => Number(v.trim())), null),
    readSafely(async () => {
      const zones = (await fs.readdir('/sys/class/thermal')).filter((z) => /^thermal_zone\d+$/.test(z));
      return Promise.all(zones.map(async (z) => {
        const dir = path.join('/sys/class/thermal', z);
        const [type, tempRaw, files] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'type'), 'utf8').then((v) => v.trim()), z),
          readSafely(() => fs.readFile(path.join(dir, 'temp'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readdir(dir), []),
        ]);
        const tripFiles = files.filter((f) => /^trip_point_\d+_temp$/.test(f)).slice(0, 4);
        const trips = await Promise.all(tripFiles.map(async (tf) => {
          const idx = tf.match(/\d+/)?.[0];
          const [tVal, tType] = await Promise.all([
            readSafely(() => fs.readFile(path.join(dir, tf), 'utf8').then((v) => Number(v.trim())), null),
            readSafely(() => fs.readFile(path.join(dir, `trip_point_${idx}_type`), 'utf8').then((v) => v.trim()), null),
          ]);
          return Number.isFinite(tVal) && tVal > 0 ? `${tType || 'trip'}: ${(tVal / 1000).toFixed(0)} °C` : null;
        }));
        return { zone: z, type, tempC: Number.isFinite(tempRaw) ? Number((tempRaw / 1000).toFixed(1)) : null, trips: trips.filter(Boolean) };
      }));
    }, []),
    readSafely(async () => {
      const devs = (await fs.readdir('/sys/class/thermal')).filter((c) => /^cooling_device\d+$/.test(c)).slice(0, 12);
      return Promise.all(devs.map(async (c) => {
        const dir = path.join('/sys/class/thermal', c);
        const [type, cur, max] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'type'), 'utf8').then((v) => v.trim()), c),
          readSafely(() => fs.readFile(path.join(dir, 'cur_state'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'max_state'), 'utf8').then((v) => Number(v.trim())), null),
        ]);
        return { device: c, type, curState: cur, maxState: max };
      }));
    }, []),
    readSafely(async () => {
      const hwmons = await fs.readdir('/sys/class/hwmon');
      const rails = [];
      for (const h of hwmons) {
        const dir = path.join('/sys/class/hwmon', h);
        const [name, files] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'name'), 'utf8').then((v) => v.trim()), h),
          readSafely(() => fs.readdir(dir), []),
        ]);
        for (const f of files.filter((x) => /^in\d+_input$/.test(x)).slice(0, 6)) {
          const mv = await readSafely(() => fs.readFile(path.join(dir, f), 'utf8').then((v) => Number(v.trim())), null);
          if (Number.isFinite(mv)) rails.push(`${name} ${f.replace('_input', '')}: ${(mv / 1000).toFixed(3)} V`);
        }
      }
      return rails;
    }, []),
    readSafely(async () => {
      const supplies = await fs.readdir('/sys/class/power_supply');
      return Promise.all(supplies.map(async (s) => {
        const dir = path.join('/sys/class/power_supply', s);
        const [type, online, status] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'type'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'online'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'status'), 'utf8').then((v) => v.trim()), null),
        ]);
        return { name: s, type, online: online === '1' ? true : online === '0' ? false : null, status };
      }));
    }, []),
    readSafely(async () => {
      const nodes = (await fs.readdir('/sys/devices/system/node')).filter((n) => /^node\d+$/.test(n));
      return Promise.all(nodes.map(async (n) => {
        const dir = path.join('/sys/devices/system/node', n);
        const [cpulist, distance, numastatText] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'cpulist'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'distance'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'numastat'), 'utf8'), ''),
        ]);
        const statMap = Object.fromEntries(numastatText.trim().split('\n').filter(Boolean).map((l) => {
          const [k, v] = l.trim().split(/\s+/);
          return [k, Number(v)];
        }));
        return { node: n, cpulist, distance, hit: statMap.numa_hit ?? null, miss: statMap.numa_miss ?? null, foreign: statMap.numa_foreign ?? null };
      }));
    }, []),
    readSafely(() => fs.readFile('/sys/kernel/mm/transparent_hugepage/enabled', 'utf8').then((v) => v.trim()), null),
    readSafely(() => fs.readFile('/proc/meminfo', 'utf8'), ''),
    readSafely(() => fs.readFile('/proc/interrupts', 'utf8'), ''),
    readSafely(async () => {
      const mcs = (await fs.readdir('/sys/devices/system/edac/mc')).filter((m) => /^mc\d+$/.test(m));
      return Promise.all(mcs.map(async (mc) => {
        const dir = path.join('/sys/devices/system/edac/mc', mc);
        const [ce, ue, scrub] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'ce_count'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'ue_count'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'sdram_scrub_rate'), 'utf8').then((v) => v.trim()), null),
        ]);
        return { mc, ceCount: ce, ueCount: ue, scrubRate: scrub };
      }));
    }, []),
    readSafely(async () => {
      const blocks = (await fs.readdir('/sys/block')).filter((b) => !/^(loop|ram|zram)\d+$/.test(b));
      return Promise.all(blocks.map(async (b) => {
        const qDir = path.join('/sys/block', b, 'queue');
        const [scheduler, nrRequests, rotational, physBlock, logBlock, statText] = await Promise.all([
          readSafely(() => fs.readFile(path.join(qDir, 'scheduler'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(qDir, 'nr_requests'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(qDir, 'rotational'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(qDir, 'physical_block_size'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(qDir, 'logical_block_size'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join('/sys/block', b, 'stat'), 'utf8').then((v) => v.trim()), ''),
        ]);
        const cols = statText.split(/\s+/).map(Number);
        const bytesRead = Number.isFinite(cols[2]) ? cols[2] * 512 : null;
        const bytesWritten = Number.isFinite(cols[6]) ? cols[6] * 512 : null;
        return { device: b, scheduler, queueDepth: nrRequests, rotational, physicalBlockSize: physBlock, logicalBlockSize: logBlock, bytesRead, bytesWritten };
      }));
    }, []),
    readSafely(async () => {
      const nvmes = await fs.readdir('/sys/class/nvme');
      return Promise.all(nvmes.map(async (n) => {
        const dir = path.join('/sys/class/nvme', n);
        const [model, state, powerState] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'model'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'state'), 'utf8').then((v) => v.trim()), null),
          readSafely(() => fs.readFile(path.join(dir, 'power/runtime_status'), 'utf8').then((v) => v.trim()), null),
        ]);
        return { controller: n, model, state, powerState };
      }));
    }, []),
    readSafely(async () => {
      const ifaces = (await fs.readdir('/sys/class/net')).filter((i) => i !== 'lo');
      return Promise.all(ifaces.map(async (iface) => {
        const dir = path.join('/sys/class/net', iface);
        const [carrier, carrierChanges, txQueueLen, addrAssignType, rxFifo, txFifo, rxDropped, txDropped, sriovTotal, sriovNum, ptpDirs] = await Promise.all([
          readSafely(() => fs.readFile(path.join(dir, 'carrier'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'carrier_changes'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'tx_queue_len'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'addr_assign_type'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'statistics/rx_fifo_errors'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'statistics/tx_fifo_errors'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'statistics/rx_dropped'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'statistics/tx_dropped'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'device/sriov_totalvfs'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(dir, 'device/sriov_numvfs'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readdir(path.join(dir, 'device/ptp')), []),
        ]);
        return {
          iface, carrier, carrierChanges, txQueueLen, addrAssignType,
          rxFifoErrors: rxFifo, txFifoErrors: txFifo, rxDropped, txDropped,
          sriovTotalVfs: sriovTotal, sriovNumVfs: sriovNum, ptpClocks: ptpDirs,
        };
      }));
    }, []),
    readSafely(async () => {
      const cards = (await fs.readdir('/sys/class/drm')).filter((n) => /^card\d+$/.test(n));
      return Promise.all(cards.map(async (card) => {
        const devDir = path.join('/sys/class/drm', card, 'device');
        const [vramUsed, vramTotal, hwmons] = await Promise.all([
          readSafely(() => fs.readFile(path.join(devDir, 'mem_info_vram_used'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readFile(path.join(devDir, 'mem_info_vram_total'), 'utf8').then((v) => Number(v.trim())), null),
          readSafely(() => fs.readdir(path.join(devDir, 'hwmon')), []),
        ]);
        let powerWatts = null;
        let pwm = null;
        let fanRpm = null;
        if (hwmons.length) {
          const hDir = path.join(devDir, 'hwmon', hwmons[0]);
          const [pUw, pwmVal, fanVal] = await Promise.all([
            readSafely(() => fs.readFile(path.join(hDir, 'power1_input'), 'utf8').then((v) => Number(v.trim())), null),
            readSafely(() => fs.readFile(path.join(hDir, 'pwm1'), 'utf8').then((v) => Number(v.trim())), null),
            readSafely(() => fs.readFile(path.join(hDir, 'fan1_input'), 'utf8').then((v) => Number(v.trim())), null),
          ]);
          if (Number.isFinite(pUw)) powerWatts = Number((pUw / 1e6).toFixed(2));
          if (Number.isFinite(pwmVal)) pwm = Math.round((pwmVal / 255) * 100);
          if (Number.isFinite(fanVal)) fanRpm = fanVal;
        }
        return { card, vramUsedBytes: vramUsed, vramTotalBytes: vramTotal, powerWatts, pwmDutyPercent: pwm, fanRpm };
      }));
    }, []),
  ]);

  const pageTablesKb = Number(meminfoText.match(/^PageTables:\s+(\d+)/m)?.[1]);
  const anonHugePagesKb = Number(meminfoText.match(/^AnonHugePages:\s+(\d+)/m)?.[1]);
  const hugePagesTotal = Number(meminfoText.match(/^HugePages_Total:\s+(\d+)/m)?.[1]);
  const hugePageSizeKb = Number(meminfoText.match(/^Hugepagesize:\s+(\d+)/m)?.[1]);

  const tlbLine = interruptsText.split('\n').find((l) => l.trim().startsWith('TLB:'));
  const tlbCounts = tlbLine ? tlbLine.trim().replace(/^TLB:\s*/, '').split(/\s+/).filter((t) => /^\d+$/.test(t)).map(Number) : [];
  const tlbTotal = tlbCounts.length ? tlbCounts.reduce((a, b) => a + b, 0) : null;

  const irqLines = interruptsText
    .split('\n')
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => /^\d+:/.test(l))
    .slice(0, 12)
    .map((l) => {
      const parts = l.split(/\s+/);
      const irq = parts[0].replace(':', '');
      const name = parts.slice(-1)[0];
      return `IRQ ${irq} (${name})`;
    });

  return {
    cpuidleStates,
    raplPackageJoules: Number.isFinite(raplPkgUj) ? Number((raplPkgUj / 1e6).toFixed(2)) : null,
    raplDramJoules: Number.isFinite(raplDramUj) ? Number((raplDramUj / 1e6).toFixed(2)) : null,
    coreThrottleCount: coreThrottle,
    packageThrottleCount: pkgThrottle,
    thermalZones,
    coolingDevices,
    hwmonVoltages,
    powerSupplies,
    numaNodes,
    thpState: thpEnabled,
    pageTablesBytes: Number.isFinite(pageTablesKb) ? pageTablesKb * 1024 : null,
    anonHugePagesBytes: Number.isFinite(anonHugePagesKb) ? anonHugePagesKb * 1024 : null,
    hugePagesTotal: Number.isFinite(hugePagesTotal) ? hugePagesTotal : null,
    hugePageSizeBytes: Number.isFinite(hugePageSizeKb) ? hugePageSizeKb * 1024 : null,
    tlbShootdownsTotal: tlbTotal,
    tlbShootdownsPerCpu: tlbCounts,
    edacControllers,
    blockQueues,
    nvmeControllers,
    netExtended,
    gpuHwmon,
    activeHardwareIrqs: irqLines,
  };
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
      const [ result, smtSiblings, onlineText, offlineText, vulnerabilitiesDir, baseFreq, maxFreq, minScale, maxScale, scaleDriver, boostFlag, noTurboFlag, epp, epb, pmuEventsDir ] = await Promise.all([
        readSafely(() => execFileAsync('lscpu', ['--json'], {
          encoding: 'utf8',
          timeout: 3000,
          maxBuffer: 256 * 1024,
        }), null),
        readSafely(async () => {
          const cpus = (await fs.readdir('/sys/devices/system/cpu')).filter((n) => /^cpu\d+$/.test(n)).slice(0, 32);
          const pairs = await Promise.all(cpus.map(async (c) => {
            const sib = await readSafely(() => fs.readFile(`/sys/devices/system/cpu/${c}/topology/thread_siblings_list`, 'utf8').then((v) => v.trim()), null);
            const cluster = await readSafely(() => fs.readFile(`/sys/devices/system/cpu/${c}/topology/cluster_id`, 'utf8').then((v) => v.trim()), null);
            return sib ? { cpu: c, siblings: sib, cluster } : null;
          }));
          return pairs.filter(Boolean);
        }, []),
        readSafely(() => fs.readFile('/sys/devices/system/cpu/online', 'utf8').then((v) => v.trim()), null),
        readSafely(() => fs.readFile('/sys/devices/system/cpu/offline', 'utf8').then((v) => v.trim()), null),
        readSafely(async () => {
          const files = await fs.readdir('/sys/devices/system/cpu/vulnerabilities');
          const entries = await Promise.all(files.slice(0, 16).map(async (f) => {
            const text = await readSafely(() => fs.readFile(`/sys/devices/system/cpu/vulnerabilities/${f}`, 'utf8').then((v) => v.trim()), null);
            return text ? `${f}: ${text}` : null;
          }));
          return entries.filter(Boolean);
        }, []),
        readSafely(() => fs.readFile('/sys/devices/system/cpu/cpu0/cpufreq/base_frequency', 'utf8').then((v) => Number(v.trim()) / 1000), null),
        readSafely(() => fs.readFile('/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq', 'utf8').then((v) => Number(v.trim()) / 1000), null),
        readSafely(() => fs.readFile('/sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq', 'utf8').then((v) => Number(v.trim()) / 1000), null),
        readSafely(() => fs.readFile('/sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq', 'utf8').then((v) => Number(v.trim()) / 1000), null),
        readSafely(() => fs.readFile('/sys/devices/system/cpu/cpu0/cpufreq/scaling_driver', 'utf8').then((v) => v.trim()), null),
        readSafely(() => fs.readFile('/sys/devices/system/cpu/cpufreq/boost', 'utf8').then((v) => v.trim()), null),
        readSafely(() => fs.readFile('/sys/devices/system/cpu/intel_pstate/no_turbo', 'utf8').then((v) => v.trim()), null),
        readSafely(() => fs.readFile('/sys/devices/system/cpu/cpu0/cpufreq/energy_performance_preference', 'utf8').then((v) => v.trim()), null),
        readSafely(() => fs.readFile('/sys/devices/system/cpu/cpu0/power/energy_perf_bias', 'utf8').then((v) => v.trim()), null),
        readSafely(() => fs.readdir('/sys/bus/event_source/devices/cpu/events'), []),
      ]);
      const rows = result?.stdout ? await readSafely(() => JSON.parse(result.stdout).lscpu || [], []) : [];
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
        smtSiblings,
        onlineCpus: onlineText,
        offlineCpus: offlineText || 'None (all cores online)',
        vulnerabilities: vulnerabilitiesDir,
        baseFrequencyMhz: Number.isFinite(baseFreq) && baseFreq > 0 ? baseFreq : null,
        boostFrequencyMhz: Number.isFinite(maxFreq) && maxFreq > 0 ? maxFreq : null,
        scalingMinMhz: Number.isFinite(minScale) && minScale > 0 ? minScale : null,
        scalingMaxMhz: Number.isFinite(maxScale) && maxScale > 0 ? maxScale : null,
        scalingDriver: scaleDriver,
        boostEnabled: boostFlag != null ? boostFlag === '1' : noTurboFlag != null ? noTurboFlag === '0' : null,
        energyPreference: epp || (epb != null ? `EPB ${epb}` : null),
        pmuEvents: pmuEventsDir,
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
      const [diskLayout, blockDevices, networkInterfaces, usbDevices, pciDevices, staticTelemetry] = await Promise.all([
        readSafely(() => systemInformation.diskLayout(), []),
        readSafely(() => systemInformation.blockDevices(), []),
        readSafely(() => systemInformation.networkInterfaces(), []),
        readSafely(() => systemInformation.usb(), []),
        readLinuxPciDevices(),
        readLinuxStaticTelemetry(),
      ]);

      return {
        storage: {
          disks: (diskLayout || []).map((disk) => pick(disk, [
            'name', 'vendor', 'type', 'size', 'firmwareRevision', 'interfaceType', 'smartStatus', 'temperature',
          ])),
          devices: (blockDevices || []).filter((device) => device && device.physical).map((device) => pick(device, [
            'model', 'type', 'size', 'physical', 'protocol', 'removable',
          ])),
        },
        network: (networkInterfaces || []).map((network) => pick(network, [
          'iface', 'type', 'default', 'operstate', 'duplex', 'speed', 'mtu', 'internal', 'virtual',
        ])),
        usb: (usbDevices || []).map((device) => pick(device, [
          'bus', 'name', 'type', 'manufacturer', 'vendor', 'removable', 'maxPower',
        ])),
        pci: (pciDevices || []).filter((device) => device && (device.vendorId || device.deviceId)),
        staticTelemetry: staticTelemetry || {},
      };
    })();
  }

  return staticInventoryPromise;
}

async function getHardwareSnapshot() {
  const [cpu, currentSpeed, currentLoad, temperature, memory, memoryLayout, graphics, system, baseboard, bios, osInfo, inventory, networkStats, battery, fanSpeeds, cpuInfo, filesystems, storageIO, bootMode, cpuInventory, cacheTopology, gpuClocks, applications, dynamicTelemetry] = await Promise.all([
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
    readLinuxDynamicTelemetry(),
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
      ...(inventory ? inventory.storage : {}),
      filesystems: (filesystems || []).map((filesystem) => pick(filesystem, [
        'type', 'size', 'used', 'available', 'use', 'rw',
      ])),
    },
    storageIO: {
      readBytesPerSecond: storageIO?.rx_sec ?? null,
      writeBytesPerSecond: storageIO?.wx_sec ?? null,
    },
    networkTraffic: (networkStats || []).map((stats) => pick(stats, ['operstate', 'rx_sec', 'tx_sec'])),
    battery: pick(battery, [
      'hasBattery', 'isCharging', 'designedCapacity', 'maxCapacity', 'currentCapacity', 'capacityUnit', 'voltage', 'percent', 'timeRemaining', 'acConnected',
    ]),
    sensors: {
      fans: fanSpeeds,
    },
    dynamicTelemetry,
  };
}

let mainWindow = null;

function createWindow() {
  log('createWindow called');
  const iconPath = path.join(__dirname, '..', 'mobile', 'assets', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#f7f8f3',
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
  const devServerUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  if (app.isPackaged) {
    log('Loading packaged file: ' + buildIndexPath);
    mainWindow.loadFile(buildIndexPath);
  } else if (process.env.ELECTRON_START_URL) {
    log('Loading start url: ' + process.env.ELECTRON_START_URL);
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    // Check if dev server is running on 3000, otherwise immediately load build/index.html
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

ipcMain.handle('device:get-hardware-snapshot', async (event) => {
  log('device:get-hardware-snapshot requested');
  return getHardwareSnapshot();
});

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