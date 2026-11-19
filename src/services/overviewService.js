export async function fetchOverviewData() {
  if (window.deviceHardware?.getOverview) {
    try {
      const data = await window.deviceHardware.getOverview();
      return { ...data, runtime: 'desktop', updatedAt: new Date() };
    } catch (error) {
      console.warn('Failed to fetch segregated overview data:', error);
    }
  }

  if (window.deviceHardware?.getSnapshot) {
    try {
      const snapshot = await window.deviceHardware.getSnapshot();
      return { ...snapshot, runtime: 'desktop', updatedAt: new Date(snapshot.capturedAt || Date.now()) };
    } catch (error) {
      console.warn('Failed to fetch snapshot overview:', error);
    }
  }

  // Web Browser Fallback
  const nav = window.navigator;
  const screenInfo = window.screen;
  return {
    runtime: 'browser',
    updatedAt: new Date(),
    browser: nav.userAgent,
    operatingSystem: nav.userAgentData?.platform || nav.platform || 'Not exposed',
    cpuThreads: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} logical processors` : 'Not exposed',
    screen: `${screenInfo.width} × ${screenInfo.height}`,
    networkStatus: nav.onLine ? 'Online' : 'Offline',
    networkType: nav.connection?.effectiveType || 'Not reported',
  };
}
