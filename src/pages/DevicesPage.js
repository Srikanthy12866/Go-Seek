import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';

export default function DevicesPage() {
  const { hardware } = useHardware();
  if (!hardware) return null;
  if (hardware.runtime !== 'desktop') return <DataPanel title="Devices & power" icon="display"><DataRow label="Access" value="Host device and battery details require the desktop app." /></DataPanel>;

  const usb = hardware.usb || [];
  const pci = hardware.pci || [];
  const battery = hardware.battery || {};
  return <div className="panel-grid">
    <DataPanel title="USB devices" icon="display">
      {usb.length ? usb.slice(0, 20).map((device, index) => <div key={`usb-${index}`}>
        <DataRow label={`USB device ${index + 1}`} value={device.name || device.type || 'Unknown device'} />
        <DataRow label="Manufacturer / bus" value={`${device.manufacturer || device.vendor || 'Not reported'} · ${device.bus || 'N/A'}`} />
        <DataRow label="Power / removable" value={`${device.maxPower || 'N/A'} · ${device.removable ? 'Yes' : 'No / unknown'}`} />
      </div>) : <DataRow label="USB devices" value="Not reported" />}
    </DataPanel>
    <DataPanel title="PCI devices & battery" icon="chip">
      {pci.length ? pci.slice(0, 20).map((device, index) => <div key={`pci-${index}`}>
        <DataRow label={`PCI device ${index + 1}`} value={`${device.vendorId || 'Vendor n/a'} · ${device.deviceId || 'Device n/a'}`} mono />
        <DataRow label="Class / subsystem" value={`${device.classCode || 'N/A'} · ${device.subsystemVendorId || 'N/A'}:${device.subsystemDeviceId || 'N/A'}`} mono />
      </div>) : <DataRow label="PCI inventory" value="Linux PCI sysfs information unavailable" />}
      <DataRow label="Battery" value={battery.hasBattery ? `${battery.percent ?? 'N/A'}%${battery.isCharging ? ' · charging' : ''}` : 'No battery reported'} />
      <DataRow label="Battery capacity" value={battery.hasBattery ? `${battery.currentCapacity ?? 'N/A'} / ${battery.maxCapacity ?? 'N/A'} ${battery.capacityUnit || ''}` : 'Not applicable'} />
      <DataRow label="Power source" value={battery.acConnected == null ? 'Not reported' : battery.acConnected ? 'AC connected' : 'Battery'} />
      <DataRow label="Estimated time remaining" value={battery.timeRemaining > 0 ? `${battery.timeRemaining} minutes` : 'Not reported'} />
    </DataPanel>
  </div>;
}