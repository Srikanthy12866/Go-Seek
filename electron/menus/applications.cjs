const systemInformation = require('systeminformation');
const fs = require('node:fs/promises');
const os = require('node:os');
const { isWindows, isLinux, isMac, readSafely } = require('../platform.cjs');

const desktopServiceNames = new Set([
  'at-spi-bus-launcher', 'at-spi2-registryd', 'dbus-daemon', 'dconf-service', 'gnome-keyring-daemon',
  'gnome-shell', 'gnome-session-binary', 'gnome-session', 'gnome-settings-daemon', 'gsd-xsettings',
  'ibus-daemon', 'kwin_wayland', 'kwin_x11', 'mutter', 'pipewire', 'pipewire-pulse', 'plasmashell',
  'pulseaudio', 'sway', 'systemd', 'waybar', 'wireplumber', 'xwayland', 'xorg',
  'xdg-desktop-portal', 'xdg-document-portal', 'xdg-permission-store',
]);

const windowsExcludedProcesses = new Set([
  'system idle process', 'system', 'registry', 'smss.exe', 'csrss.exe',
  'wininit.exe', 'winlogon.exe', 'services.exe', 'lsass.exe', 'svchost.exe',
  'fontdrvhost.exe', 'sihost.exe', 'dwm.exe', 'ctfmon.exe', 'spoolsv.exe',
]);

let applicationSessionCache = new Map();

async function readLinuxApplications(processList = []) {
  const currentUser = os.userInfo().username;
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

function readWindowsApplications(processList = []) {
  return processList
    .filter((p) => p && p.name && !windowsExcludedProcesses.has(p.name.toLowerCase()))
    .map((item) => ({
      pid: item.pid,
      name: item.name.replace(/\.exe$/i, ''),
      cpuPercent: Number.isFinite(item.cpu) ? Number(item.cpu.toFixed(1)) : 0,
      memoryPercent: Number.isFinite(item.mem) ? Number(item.mem.toFixed(1)) : 0,
      residentBytes: Number.isFinite(item.memRss) ? item.memRss * 1024 : null,
      state: item.state || 'running',
      started: item.started || null,
      childProcessCount: 0,
    }))
    .sort((a, b) => ((b.cpuPercent * 2) + b.memoryPercent) - ((a.cpuPercent * 2) + a.memoryPercent))
    .slice(0, 100);
}

function readDarwinApplications(processList = []) {
  const darwinExcluded = new Set(['launchd', 'kernel_task', 'syslogd', 'UserEventAgent', 'distnoted', 'cfprefsd']);
  return processList
    .filter((p) => p && p.name && !darwinExcluded.has(p.name))
    .map((item) => ({
      pid: item.pid,
      name: item.name.replace(/\.app$/i, ''),
      cpuPercent: Number.isFinite(item.cpu) ? Number(item.cpu.toFixed(1)) : 0,
      memoryPercent: Number.isFinite(item.mem) ? Number(item.mem.toFixed(1)) : 0,
      residentBytes: Number.isFinite(item.memRss) ? item.memRss * 1024 : null,
      state: item.state || 'running',
      started: item.started || null,
      childProcessCount: 0,
    }))
    .sort((a, b) => (b.cpuPercent || 0) - (a.cpuPercent || 0))
    .slice(0, 100);
}

async function getApplicationsData() {
  const snapshot = await readSafely(() => systemInformation.processes(), { list: [] });
  const processList = snapshot.list || [];

  let applications = [];
  if (isLinux) {
    applications = await readLinuxApplications(processList);
  } else if (isWindows) {
    applications = readWindowsApplications(processList);
  } else {
    applications = readDarwinApplications(processList);
  }

  return {
    applicationsSupported: true,
    applications,
  };
}

module.exports = {
  getApplicationsData,
  readLinuxApplications,
  readWindowsApplications,
  readDarwinApplications,
};
