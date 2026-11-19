export async function fetchDisplayData() {
  if (window.deviceHardware?.getDisplay) {
    try {
      const data = await window.deviceHardware.getDisplay();
      return { ...data, runtime: 'desktop', updatedAt: new Date() };
    } catch (error) {
      console.warn('Failed to fetch segregated display data:', error);
    }
  }

  if (window.deviceHardware?.getSnapshot) {
    try {
      const snapshot = await window.deviceHardware.getSnapshot();
      return {
        runtime: 'desktop',
        display: snapshot.display || [],
        staticTelemetry: snapshot.staticTelemetry || {},
        updatedAt: new Date(snapshot.capturedAt || Date.now()),
      };
    } catch (error) {
      console.warn('Failed to fetch snapshot display:', error);
    }
  }

  const screenInfo = window.screen;
  return {
    runtime: 'browser',
    screen: `${screenInfo.width} × ${screenInfo.height}`,
    availableScreen: `${screenInfo.availWidth} × ${screenInfo.availHeight}`,
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    pixelRatio: `${window.devicePixelRatio || 1} dppx`,
    colorDepth: `${screenInfo.colorDepth || 24} bits`,
    orientation: screenInfo.orientation?.type || 'Not exposed',
    touchPoints: window.navigator?.maxTouchPoints ?? 0,
    display: [],
    updatedAt: new Date(),
  };
}
