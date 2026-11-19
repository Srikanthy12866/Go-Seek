export async function fetchMemoryData() {
  if (window.deviceHardware?.getMemory) {
    try {
      const data = await window.deviceHardware.getMemory();
      return { ...data, runtime: 'desktop', updatedAt: new Date() };
    } catch (error) {
      console.warn('Failed to fetch segregated memory data:', error);
    }
  }

  if (window.deviceHardware?.getSnapshot) {
    try {
      const snapshot = await window.deviceHardware.getSnapshot();
      return {
        runtime: 'desktop',
        memory: snapshot.memory || {},
        updatedAt: new Date(snapshot.capturedAt || Date.now()),
      };
    } catch (error) {
      console.warn('Failed to fetch snapshot memory:', error);
    }
  }

  return {
    runtime: 'browser',
    memory: {},
    updatedAt: new Date(),
  };
}
