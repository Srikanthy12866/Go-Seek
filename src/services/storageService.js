export async function fetchStorageData() {
  if (window.deviceHardware?.getStorage) {
    try {
      const data = await window.deviceHardware.getStorage();
      return { ...data, runtime: 'desktop', updatedAt: new Date() };
    } catch (error) {
      console.warn('Failed to fetch segregated storage data:', error);
    }
  }

  if (window.deviceHardware?.getSnapshot) {
    try {
      const snapshot = await window.deviceHardware.getSnapshot();
      return {
        runtime: 'desktop',
        storage: snapshot.storage || {},
        storageIO: snapshot.storageIO || {},
        dynamicTelemetry: snapshot.dynamicTelemetry || {},
        updatedAt: new Date(snapshot.capturedAt || Date.now()),
      };
    } catch (error) {
      console.warn('Failed to fetch snapshot storage:', error);
    }
  }

  return {
    runtime: 'browser',
    storage: {},
    updatedAt: new Date(),
  };
}
