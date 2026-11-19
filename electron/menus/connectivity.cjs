const systemInformation = require('systeminformation');
const fs = require('node:fs/promises');
const path = require('node:path');
const { isWindows, isLinux, isMac, readSafely, pick } = require('../platform.cjs');

async function getConnectivityData() {
  const [networkInterfaces, networkStats] = await Promise.all([
    readSafely(() => systemInformation.networkInterfaces(), []),
    readSafely(() => systemInformation.networkStats(), []),
  ]);

  let netExtended = [];

  if (isLinux) {
    const ifaces = (await readSafely(() => fs.readdir('/sys/class/net'), [])).filter((i) => i !== 'lo');
    netExtended = await Promise.all(ifaces.map(async (iface) => {
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
  } else if (isWindows) {
    netExtended = (networkInterfaces || []).map((n) => ({
      iface: n.iface,
      carrier: n.operstate === 'up' ? 1 : 0,
      carrierChanges: 0,
      txQueueLen: 1000,
      addrAssignType: 0,
      rxFifoErrors: 0,
      txFifoErrors: 0,
      rxDropped: 0,
      txDropped: 0,
      sriovTotalVfs: null,
      sriovNumVfs: 0,
      ptpClocks: [],
    }));
  } else {
    netExtended = (networkInterfaces || []).map((n) => ({
      iface: n.iface,
      carrier: n.operstate === 'up' ? 1 : 0,
      carrierChanges: 0,
      txQueueLen: 512,
      addrAssignType: 0,
      rxFifoErrors: 0,
      txFifoErrors: 0,
      rxDropped: 0,
      txDropped: 0,
      sriovTotalVfs: null,
      sriovNumVfs: 0,
      ptpClocks: [],
    }));
  }

  return {
    network: (networkInterfaces || []).map((network) => pick(network, [
      'iface', 'type', 'default', 'operstate', 'duplex', 'speed', 'mtu', 'internal', 'virtual',
    ])),
    networkTraffic: (networkStats || []).map((stats) => pick(stats, ['operstate', 'rx_sec', 'tx_sec'])),
    dynamicTelemetry: {
      netExtended,
    },
  };
}

module.exports = { getConnectivityData };
