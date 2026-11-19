const fs = require('node:fs/promises');
const syncFs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

const logFile = path.join(__dirname, '..', 'electron-run.log');
function log(msg) {
  try {
    syncFs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (_) {}
}

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

module.exports = {
  isWindows,
  isLinux,
  isMac,
  log,
  readSafely,
  pick,
  execFileAsync,
  pciSysfsAddress,
  decodeDisplayedCpuId,
  parseKernelCacheSize,
  parsePpDpmCurrentMhz,
};
