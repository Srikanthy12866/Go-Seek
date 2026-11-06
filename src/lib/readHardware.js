export const readHardware = async () => {
  if (window.deviceHardware?.getSnapshot) {
    const snapshot = await window.deviceHardware.getSnapshot();
    return { ...snapshot, updatedAt: new Date(snapshot.capturedAt) };
  }

  const nav = window.navigator;
  const screenInfo = window.screen;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  const userAgent = nav.userAgent || '';
  const browser = userAgent.includes('Edg/')
    ? 'Microsoft Edge'
    : userAgent.includes('Firefox/')
      ? 'Mozilla Firefox'
      : userAgent.includes('Chrome/')
        ? 'Google Chrome'
        : userAgent.includes('Safari/')
          ? 'Safari'
          : 'Unknown browser';

  let graphics = 'Not exposed by this browser';
  try {
    if (/jsdom/i.test(userAgent)) throw new Error('Graphics information is not available in the test environment');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const extension = context && context.getExtension('WEBGL_debug_renderer_info');
    if (extension) graphics = context.getParameter(extension.UNMASKED_RENDERER_WEBGL);
    else if (context) graphics = context.getParameter(context.RENDERER);
  } catch (error) {
    graphics = 'Unavailable';
  }

  let battery = 'Not supported';
  if (typeof nav.getBattery === 'function') {
    try {
      const batteryInfo = await nav.getBattery();
      battery = `${Math.round(batteryInfo.level * 100)}%${batteryInfo.charging ? ' · charging' : ''}`;
    } catch (error) {
      battery = 'Permission unavailable';
    }
  }

  let storage = 'Unavailable';
  if (nav.storage && nav.storage.estimate) {
    try {
      const estimate = await nav.storage.estimate();
      const available = estimate.quota ? `${(estimate.quota / 1024 ** 3).toFixed(1)} GB available to this site` : 'Estimate unavailable';
      const used = estimate.usage ? `${(estimate.usage / 1024 ** 2).toFixed(1)} MB used` : '0 MB used';
      storage = `${used} · ${available}`;
    } catch (error) {
      storage = 'Estimate unavailable';
    }
  }

  return {
    updatedAt: new Date(),
    browser,
    operatingSystem: nav.userAgentData?.platform || nav.platform || 'Not exposed',
    browserVersion: userAgent.match(/(?:Chrome|Firefox|Edg|Version)\/[\d.]+/)?.[0]?.split('/')[1] || 'Not exposed',
    cpuThreads: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} logical processors` : 'Not exposed',
    memory: nav.deviceMemory ? `About ${nav.deviceMemory} GB` : 'Not exposed',
    graphics,
    screen: `${screenInfo.width} × ${screenInfo.height}`,
    availableScreen: `${screenInfo.availWidth} × ${screenInfo.availHeight}`,
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    pixelRatio: `${window.devicePixelRatio || 1}×`,
    colorDepth: `${screenInfo.colorDepth || 'Unknown'} bit`,
    orientation: screenInfo.orientation?.type?.replace('-', ' ') || 'Not exposed',
    networkStatus: nav.onLine ? 'Online' : 'Offline',
    networkType: connection?.effectiveType || 'Not reported',
    downlink: connection?.downlink ? `${connection.downlink} Mbps` : 'Not reported',
    latency: connection?.rtt ? `${connection.rtt} ms` : 'Not reported',
    dataSaver: connection?.saveData ? 'On' : 'Off / not reported',
    battery,
    storage,
    touchPoints: nav.maxTouchPoints ? `${nav.maxTouchPoints} touch points` : 'No touch input reported',
    language: nav.language || 'Not exposed',
    languages: nav.languages?.join(', ') || nav.language || 'Not exposed',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookies: nav.cookieEnabled ? 'Enabled' : 'Disabled',
    userAgent,
  };
};