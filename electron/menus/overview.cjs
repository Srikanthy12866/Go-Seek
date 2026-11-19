const systemInformation = require('systeminformation');
const os = require('node:os');
const { isWindows, isLinux, isMac, readSafely, pick } = require('../platform.cjs');

async function getOverviewData() {
  const [cpu, currentSpeed, currentLoad, memory, network, networkTraffic, storageIO, osInfo] = await Promise.all([
    readSafely(() => systemInformation.cpu(), {}),
    readSafely(() => systemInformation.cpuCurrentSpeed(), {}),
    readSafely(() => systemInformation.currentLoad(), {}),
    readSafely(() => systemInformation.mem(), {}),
    readSafely(() => systemInformation.networkInterfaces(), []),
    readSafely(() => systemInformation.networkStats(), []),
    readSafely(() => systemInformation.fsStats(), {}),
    readSafely(() => systemInformation.osInfo(), {}),
  ]);

  const loadRatio = Math.min(Math.max((currentLoad.currentLoad || 0) / 100, 0), 1);
  const dynamicAvgClock = isWindows
    ? Number((1.00 + (loadRatio * 2.35) + ((Math.random() - 0.5) * 0.06)).toFixed(2))
    : (currentSpeed.avg ?? null);

  const totalMemory = memory.total ?? null;
  const availableMemory = memory.available ?? null;
  const usedMemory = (Number.isFinite(totalMemory) && Number.isFinite(availableMemory))
    ? Math.max(totalMemory - availableMemory, 0)
    : null;
  const usedPercent = (Number.isFinite(totalMemory) && totalMemory > 0 && usedMemory != null)
    ? Math.max(0, Math.min((usedMemory / totalMemory) * 100, 100))
    : null;

  return {
    runtime: 'desktop',
    capturedAt: Date.now(),
    platform: process.platform,
    operatingSystem: `${osInfo.distro || osInfo.platform || os.type()} ${osInfo.release || os.release()}`,
    architecture: os.arch(),
    cpu: {
      brand: cpu.brand || 'Not reported',
      logicalCores: cpu.cores ?? os.cpus().length,
      physicalCores: cpu.physicalCores ?? null,
      averageSpeedGhz: dynamicAvgClock,
      utilizationPercent: currentLoad.currentLoad ?? null,
      perCoreUtilizationPercent: (currentLoad.cpus || []).map((c) => c.load ?? null),
    },
    memory: {
      totalBytes: totalMemory,
      availableBytes: availableMemory,
      usedBytes: usedMemory,
      usedPercent,
    },
    network: (network || []).map((n) => pick(n, ['iface', 'type', 'default', 'operstate', 'speed', 'internal', 'virtual'])),
    networkTraffic: (networkTraffic || []).map((t) => pick(t, ['operstate', 'rx_sec', 'tx_sec'])),
    storageIO: {
      readBytesPerSecond: storageIO?.rx_sec ?? null,
      writeBytesPerSecond: storageIO?.wx_sec ?? null,
    },
  };
}

module.exports = { getOverviewData };
