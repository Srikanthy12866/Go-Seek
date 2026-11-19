export async function fetchDevicesData() {
  if (window.deviceHardware?.getDevices) {
    try {
      const data = await window.deviceHardware.getDevices();
      return { ...data, runtime: 'desktop', updatedAt: new Date() };
    } catch (error) {
      console.warn('Failed to fetch segregated devices data:', error);
    }
  }

  if (window.deviceHardware?.getSnapshot) {
    try {
      const snapshot = await window.deviceHardware.getSnapshot();
      return {
        runtime: 'desktop',
        usb: snapshot.usb || [],
        pci: snapshot.pci || [],
        battery: snapshot.battery || {},
        sensors: snapshot.sensors || {},
        staticTelemetry: snapshot.staticTelemetry || {},
        dynamicTelemetry: snapshot.dynamicTelemetry || {},
        updatedAt: new Date(snapshot.capturedAt || Date.now()),
      };
    } catch (error) {
      console.warn('Failed to fetch snapshot devices:', error);
    }
  }

  return {
    runtime: 'browser',
    usb: [],
    pci: [],
    battery: {},
    sensors: {},
    updatedAt: new Date(),
  };
}
