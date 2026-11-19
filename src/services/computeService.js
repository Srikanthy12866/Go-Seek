export async function fetchComputeData() {
  if (window.deviceHardware?.getCompute) {
    try {
      const data = await window.deviceHardware.getCompute();
      return { ...data, runtime: 'desktop', updatedAt: new Date() };
    } catch (error) {
      console.warn('Failed to fetch segregated compute data:', error);
    }
  }

  if (window.deviceHardware?.getSnapshot) {
    try {
      const snapshot = await window.deviceHardware.getSnapshot();
      return {
        runtime: 'desktop',
        soc: snapshot.soc || {},
        cpu: snapshot.cpu || {},
        cpuInventory: snapshot.cpuInventory || {},
        graphics: snapshot.graphics || [],
        bench: snapshot.bench || {},
        sensors: snapshot.sensors || {},
        staticTelemetry: snapshot.staticTelemetry || {},
        dynamicTelemetry: snapshot.dynamicTelemetry || {},
        updatedAt: new Date(snapshot.capturedAt || Date.now()),
      };
    } catch (error) {
      console.warn('Failed to fetch snapshot compute:', error);
    }
  }

  // Browser Fallback
  const nav = window.navigator;
  return {
    runtime: 'browser',
    updatedAt: new Date(),
    cpuThreads: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} logical processors` : 'Not exposed',
    soc: { name: 'Processor model restricted by browser sandbox' },
    cpu: {
      logicalCores: nav.hardwareConcurrency || 1,
      physicalCores: null,
      averageSpeedGhz: null,
      utilizationPercent: null,
      current: [],
      caches: {},
      cacheInstances: [],
    },
    graphics: [],
  };
}
