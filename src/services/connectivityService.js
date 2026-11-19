export async function fetchConnectivityData() {
  if (window.deviceHardware?.getConnectivity) {
    try {
      const data = await window.deviceHardware.getConnectivity();
      return { ...data, runtime: 'desktop', updatedAt: new Date() };
    } catch (error) {
      console.warn('Failed to fetch segregated connectivity data:', error);
    }
  }

  if (window.deviceHardware?.getSnapshot) {
    try {
      const snapshot = await window.deviceHardware.getSnapshot();
      return {
        runtime: 'desktop',
        network: snapshot.network || [],
        networkTraffic: snapshot.networkTraffic || [],
        dynamicTelemetry: snapshot.dynamicTelemetry || {},
        updatedAt: new Date(snapshot.capturedAt || Date.now()),
      };
    } catch (error) {
      console.warn('Failed to fetch snapshot connectivity:', error);
    }
  }

  const nav = window.navigator;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  return {
    runtime: 'browser',
    networkStatus: nav.onLine ? 'Online' : 'Offline',
    networkType: connection?.effectiveType || 'Not reported',
    downlink: connection?.downlink ? `${connection.downlink} Mbps` : 'Estimate unavailable',
    latency: connection?.rtt ? `${connection.rtt} ms` : 'Estimate unavailable',
    dataSaver: connection?.saveData ? 'Enabled' : 'Not enabled',
    network: [],
    networkTraffic: [],
    updatedAt: new Date(),
  };
}
