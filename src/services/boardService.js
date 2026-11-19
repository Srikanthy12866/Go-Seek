export async function fetchBoardData() {
  if (window.deviceHardware?.getBoard) {
    try {
      const data = await window.deviceHardware.getBoard();
      return { ...data, runtime: 'desktop', updatedAt: new Date() };
    } catch (error) {
      console.warn('Failed to fetch segregated board data:', error);
    }
  }

  if (window.deviceHardware?.getSnapshot) {
    try {
      const snapshot = await window.deviceHardware.getSnapshot();
      return {
        runtime: 'desktop',
        system: snapshot.system || {},
        mainboard: snapshot.mainboard || {},
        bios: snapshot.bios || {},
        staticTelemetry: snapshot.staticTelemetry || {},
        dynamicTelemetry: snapshot.dynamicTelemetry || {},
        graphics: snapshot.graphics || [],
        updatedAt: new Date(snapshot.capturedAt || Date.now()),
      };
    } catch (error) {
      console.warn('Failed to fetch snapshot board:', error);
    }
  }

  return {
    runtime: 'browser',
    system: {},
    mainboard: {},
    bios: {},
    updatedAt: new Date(),
  };
}
