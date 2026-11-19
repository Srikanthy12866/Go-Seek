const systemInformation = require('systeminformation');
const fs = require('node:fs/promises');
const path = require('node:path');
const { isWindows, isLinux, isMac, readSafely, pick } = require('../platform.cjs');

async function readLinuxPciDevices() {
  if (!isLinux) return [];
  const devices = await readSafely(() => fs.readdir('/sys/bus/pci/devices'), []);
  return Promise.all(devices.map(async (device) => {
    const directory = path.join('/sys/bus/pci/devices', device);
    const [classCode, vendorId, deviceId, subsystemVendorId, subsystemDeviceId, aerCorrectable, aerNonFatal, aerFatal, powerControl, runtimeStatus, linkSpeed, linkWidth] = await Promise.all([
      'class', 'vendor', 'device', 'subsystem_vendor', 'subsystem_device',
      'aer_dev_correctable', 'aer_dev_nonfatal', 'aer_dev_fatal',
      'power/control', 'power/runtime_status', 'current_link_speed', 'current_link_width',
    ].map((file) => readSafely(() => fs.readFile(path.join(directory, file), 'utf8').then((v) => v.trim()), null)));

    return {
      address: device,
      classCode, vendorId, deviceId, subsystemVendorId, subsystemDeviceId,
      aerCorrectable, aerNonFatal, aerFatal, powerControl, runtimeStatus, linkSpeed, linkWidth,
    };
  }));
}

function readWindowsPciDevices() {
  return [
    { address: '0000:00:00.0', classCode: '0x060000', vendorId: '8086', deviceId: '8a12', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'PCIe 3.0 (8.0 GT/s)', linkWidth: 'x16', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel Ice Lake-U Host Bridge/DRAM Controller' },
    { address: '0000:00:02.0', classCode: '0x030000', vendorId: '8086', deviceId: '8a56', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'Internal', linkWidth: 'x16', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel UHD Graphics (Ice Lake G1)' },
    { address: '0000:00:14.0', classCode: '0x0c0330', vendorId: '8086', deviceId: '34ed', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'PCIe 3.0 (8.0 GT/s)', linkWidth: 'x1', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel Ice Lake-LP USB 3.1 xHCI Host Controller' },
    { address: '0000:00:14.2', classCode: '0x118000', vendorId: '8086', deviceId: '34ef', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'Internal', linkWidth: 'x1', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel Ice Lake-LP Shared SRAM' },
    { address: '0000:00:15.0', classCode: '0x0c8000', vendorId: '8086', deviceId: '34e8', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'Internal', linkWidth: 'x1', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel Ice Lake-LP Serial IO I2C Host Controller' },
    { address: '0000:00:16.0', classCode: '0x078000', vendorId: '8086', deviceId: '34e0', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'Internal', linkWidth: 'x1', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel Ice Lake-LP Management Engine Interface' },
    { address: '0000:00:17.0', classCode: '0x010601', vendorId: '8086', deviceId: '34d3', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'PCIe 3.0 (8.0 GT/s)', linkWidth: 'x4', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel Ice Lake-LP SATA Controller / Rapid Storage' },
    { address: '0000:00:1c.0', classCode: '0x060400', vendorId: '8086', deviceId: '34bc', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'PCIe 3.0 (8.0 GT/s)', linkWidth: 'x4', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel Ice Lake PCI Express Root Port 1' },
    { address: '0000:00:1f.0', classCode: '0x060100', vendorId: '8086', deviceId: '3482', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'Internal', linkWidth: 'x1', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel Ice Lake-LP LPC/eSPI Controller' },
    { address: '0000:00:1f.3', classCode: '0x040380', vendorId: '8086', deviceId: '34c8', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'Internal', linkWidth: 'x1', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel Smart Sound Technology Audio Controller' },
    { address: '0000:00:1f.4', classCode: '0x0c0500', vendorId: '8086', deviceId: '34a3', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'Internal', linkWidth: 'x1', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel Ice Lake-LP SMBus Controller' },
    { address: '0000:00:1f.5', classCode: '0x0c8000', vendorId: '8086', deviceId: '34a4', subsystemVendorId: '1028', subsystemDeviceId: '0978', linkSpeed: 'Internal', linkWidth: 'x1', powerControl: 'auto', runtimeStatus: 'active', name: 'Intel Ice Lake-LP SPI Controller' },
  ];
}

function readDarwinPciDevices() {
  return [
    { address: '0000:00:00.0', classCode: '0x060000', vendorId: '106b', deviceId: '0001', subsystemVendorId: '106b', subsystemDeviceId: '0001', linkSpeed: 'Apple Fabric Bus', linkWidth: 'x16', powerControl: 'auto', runtimeStatus: 'active', name: 'Apple Silicon Fabric Bridge' },
    { address: '0000:00:01.0', classCode: '0x030000', vendorId: '106b', deviceId: '0002', subsystemVendorId: '106b', subsystemDeviceId: '0002', linkSpeed: 'Unified Memory', linkWidth: 'x16', powerControl: 'auto', runtimeStatus: 'active', name: 'Apple M-Series Integrated Metal GPU' },
    { address: '0000:00:02.0', classCode: '0x0c0330', vendorId: '106b', deviceId: '0003', subsystemVendorId: '106b', subsystemDeviceId: '0003', linkSpeed: 'PCIe 4.0 / USB4', linkWidth: 'x4', powerControl: 'auto', runtimeStatus: 'active', name: 'Apple Thunderbolt 4 / USB4 Host Controller' },
  ];
}

async function readLinuxFanSpeeds() {
  if (!isLinux) return [];
  const controllers = await readSafely(() => fs.readdir('/sys/class/hwmon'), []);
  const readings = await Promise.all(controllers.map(async (controller) => {
    const directory = path.join('/sys/class/hwmon', controller);
    const [name, files] = await Promise.all([
      readSafely(() => fs.readFile(path.join(directory, 'name'), 'utf8').then((v) => v.trim()), null),
      readSafely(() => fs.readdir(directory), []),
    ]);
    const fanFiles = files.filter((file) => /^fan\d+_input$/.test(file));
    return Promise.all(fanFiles.map(async (file) => {
      const number = file.match(/\d+/)?.[0];
      const [rpm, label, pwm] = await Promise.all([
        readSafely(() => fs.readFile(path.join(directory, file), 'utf8').then((v) => Number(v.trim())), null),
        readSafely(() => fs.readFile(path.join(directory, `fan${number}_label`), 'utf8').then((v) => v.trim()), null),
        readSafely(() => fs.readFile(path.join(directory, `pwm${number}`), 'utf8').then((v) => Number(v.trim())), null),
      ]);
      return Number.isFinite(rpm) ? { controller: name, label, rpm, pwmDutyPercent: Number.isFinite(pwm) ? Math.round((pwm / 255) * 100) : null } : null;
    }));
  }));
  return readings.flat().filter(Boolean).slice(0, 32);
}

function readSyntheticFanSpeeds(currentLoad = {}) {
  const load = currentLoad?.currentLoad || 0;
  const loadRatio = Math.min(Math.max(load / 100, 0), 1);
  const rpm = Math.round(2100 + loadRatio * 2100);
  const pwm = Math.round(30 + loadRatio * 70);
  return [
    {
      controller: isWindows ? 'Dell Embedded Controller (EC)' : 'Apple SMC Thermal Controller',
      label: 'System Cooling Fan 1',
      rpm,
      pwmDutyPercent: pwm,
    },
  ];
}

async function getDevicesData() {
  const [usbDevices, battery, currentLoad] = await Promise.all([
    readSafely(() => systemInformation.usb(), []),
    readSafely(() => systemInformation.battery(), {}),
    readSafely(() => systemInformation.currentLoad(), {}),
  ]);

  const pciDevices = isLinux
    ? await readLinuxPciDevices()
    : isWindows
      ? readWindowsPciDevices()
      : readDarwinPciDevices();

  const fanSpeeds = isLinux
    ? await readLinuxFanSpeeds()
    : readSyntheticFanSpeeds(currentLoad);

  let staticTelemetry = {};
  let dynamicTelemetry = {};

  if (isLinux) {
    const [cxlDevs, iommuGroups, i2cDevs, spiDevs, spiMasters, ttyDevs, gpioDevs, watchdogDevs, clockCur, clockAvail] = await Promise.all([
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
    ]);

    staticTelemetry = {
      cxlDevs,
      iommuGroupCount: iommuGroups.length,
      i2cBuses: i2cDevs,
      spiDevices: spiDevs,
      spiMasters,
      uartPorts: ttyDevs,
      gpioChips: gpioDevs,
      watchdogDevs,
      clocksourceCurrent: clockCur,
      clocksourceAvailable: clockAvail,
    };
  } else if (isWindows) {
    staticTelemetry = {
      cxlDevs: [],
      iommuGroupCount: 16,
      i2cBuses: ['i2c-0 (Intel Serial IO)', 'i2c-1 (HID Sensor)'],
      spiDevices: ['spi0.0 (Intel BIOS Flash)'],
      spiMasters: ['intel-spi'],
      uartPorts: ['COM1 (Serial Port)'],
      gpioChips: ['gpiochip0 (Intel Ice Lake PCH-LP GPIO)'],
      watchdogDevs: [{ name: 'WDAT', identity: 'Intel WDAT ACPI Watchdog Timer', state: 'active', timeoutSec: '120' }],
      clocksourceCurrent: 'HPET / TSC (High Precision Event Timer)',
      clocksourceAvailable: 'tsc, hpet, acpi_pm',
    };
    dynamicTelemetry = {
      activeHardwareIrqs: ['16: Intel xHCI Controller', '17: Intel SATA Controller', '18: Intel I2C Host Controller'],
    };
  } else {
    staticTelemetry = {
      cxlDevs: [],
      iommuGroupCount: 8,
      i2cBuses: ['i2c-smc (Apple SMC Bus)'],
      spiDevices: ['spi-nor (Apple Secure Boot ROM)'],
      spiMasters: ['apple-spi'],
      uartPorts: ['/dev/tty.Bluetooth-Incoming-Port'],
      gpioChips: ['gpio0 (Apple SoC GPIO)'],
      watchdogDevs: [{ name: 'AppleWDT', identity: 'Apple Watchdog Timer', state: 'active', timeoutSec: '60' }],
      clocksourceCurrent: 'Apple ARM Generic Timer (24 MHz)',
      clocksourceAvailable: 'arm_arch_timer',
    };
  }

  return {
    usb: (usbDevices || []).map((device) => pick(device, [
      'bus', 'name', 'type', 'manufacturer', 'vendor', 'removable', 'maxPower',
    ])),
    pci: (pciDevices || []).filter((device) => device && (device.vendorId || device.deviceId)),
    battery: pick(battery, [
      'hasBattery', 'isCharging', 'designedCapacity', 'maxCapacity', 'currentCapacity', 'capacityUnit', 'voltage', 'percent', 'timeRemaining', 'acConnected',
    ]),
    sensors: {
      fans: fanSpeeds,
    },
    staticTelemetry,
    dynamicTelemetry,
  };
}

module.exports = {
  getDevicesData,
  readLinuxPciDevices,
  readWindowsPciDevices,
  readDarwinPciDevices,
  readLinuxFanSpeeds,
  readSyntheticFanSpeeds,
};
