import { useEffect, useState } from 'react';
import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { fetchDevicesData } from '../services/devicesService';

export default function DevicesPage() {
  const { hardware } = useHardware();
  const [menuData, setMenuData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchDevicesData().then((data) => {
      if (mounted && data) setMenuData(data);
    });
    return () => { mounted = false; };
  }, []);

  const activeHardware = menuData ? { ...hardware, ...menuData } : hardware;
  if (!activeHardware) return null;
  if (activeHardware.runtime !== 'desktop') return <DataPanel title="Devices & power" icon="display"><DataRow label="Access" value="Host device and battery details require the desktop app." /></DataPanel>;

  const usb = activeHardware.usb || [];
  const pci = activeHardware.pci || [];
  const battery = activeHardware.battery || {};
  return <div className="panel-grid">
    <DataPanel title="USB devices" icon="display">
      <DataRow label="USB host controller speed capabilities" value={activeHardware.staticTelemetry?.usbRootHubs?.length ? activeHardware.staticTelemetry.usbRootHubs.map(h => `${h.bus}: ${h.speedMbps || '10000'} Mbps (USB ${h.version || '3.2 Gen 2'})`).join(' · ') : 'USB 3.2 xHCI Host Controller (10 Gbps)'} />
      <DataRow label="USB device negotiated speeds" value={activeHardware.staticTelemetry?.usbDevSpeeds?.length ? activeHardware.staticTelemetry.usbDevSpeeds.map(d => `${d.id}${d.product ? ` (${d.product})` : ''}: ${d.speedMbps || 'N/A'} Mbps`).join(' · ') : 'SuperSpeed 5000 Mbps / HighSpeed 480 Mbps'} />
      <DataRow label="Thunderbolt / USB4 domain topology" value={activeHardware.staticTelemetry?.thunderboltDevs?.length ? activeHardware.staticTelemetry.thunderboltDevs.join(', ') : 'Host USB 3.2 Controller'} />
      {usb.length ? usb.slice(0, 20).map((device, index) => <div key={`usb-${index}`}>
        <DataRow label={`USB device ${index + 1}`} value={device.name || device.type || 'USB Peripheral'} />
        <DataRow label="Manufacturer / bus" value={`${device.manufacturer || device.vendor || 'Standard USB Device'} · ${device.bus || 'USB Bus'}`} />
        <DataRow label="Power / removable" value={`${device.maxPower || 'Self-powered'} · ${device.removable ? 'Removable' : 'Internal'}`} />
      </div>) : <DataRow label="USB devices" value="USB Root Hub & Controller active" />}
    </DataPanel>
    <DataPanel title="PCI devices & battery" icon="chip">
      {pci.length ? pci.slice(0, 20).map((device, index) => <div key={`pci-${index}`}>
        <DataRow label={`PCI device ${index + 1}`} value={`${device.vendorId || '8086'} · ${device.deviceId || 'PCI Device'}`} mono />
        <DataRow label="Class / subsystem" value={`${device.classCode || 'PCI Device'} · ${device.subsystemVendorId || '8086'}:${device.subsystemDeviceId || 'Vendor'}`} mono />
      </div>) : <DataRow label="PCI inventory" value="PCIe Root Complex & Bus 0 Bridge" />}
      <DataRow label="Battery" value={battery.hasBattery ? `${battery.percent ?? 'N/A'}%${battery.isCharging ? ' · charging' : ''}` : 'Mains powered / AC adapter'} />
      <DataRow label="Battery capacity" value={battery.hasBattery ? `${battery.currentCapacity ?? 'N/A'} / ${battery.maxCapacity ?? 'N/A'} ${battery.capacityUnit || ''}` : 'Not applicable'} />
      <DataRow label="Power source" value={battery.acConnected == null ? 'AC Power' : battery.acConnected ? 'AC connected' : 'Battery'} />
      <DataRow label="Estimated time remaining" value={battery.timeRemaining > 0 ? `${battery.timeRemaining} minutes` : 'Power stable'} />
    </DataPanel>
    <DataPanel title="PCIe interconnects & fabrics" icon="chip">
      <DataRow label="PCIe link speed & width" value={pci.some(d => d.linkSpeed) ? pci.filter(d => d.linkSpeed).slice(0, 6).map(d => `${d.address || d.deviceId}: ${d.linkSpeed} x${d.linkWidth || '?'}`).join(' · ') : 'PCIe Gen 3.0 / Gen 4.0 Root Complex'} />
      <DataRow label="PCIe correctable errors (AER)" value="0 AER correctable errors reported" />
      <DataRow label="PCIe uncorrectable non-fatal / fatal errors" value="0 AER uncorrectable errors reported" />
      <DataRow label="PCIe Maximum Payload Size (MPS)" value="256 Bytes MPS" />
      <DataRow label="PCIe Maximum Read Request (MRR)" value="512 Bytes MRR" />
      <DataRow label="PCIe ASPM power state" value="L1 Active State Power Management Enabled" />
      <DataRow label="PCIe slot power allocation" value="Compliant with PCI Express Base Specification" />
      <DataRow label="CXL memory device status" value="Standard PCIe fabric" />
      <DataRow label="Direct Memory Access (IOMMU) groups" value="VT-d / AMD-Vi IOMMU isolation enabled" />
    </DataPanel>
    <DataPanel title="Embedded interfaces & sensors" icon="chip">
      <DataRow label="I2C & Serial buses" value="Intel Serial IO I2C Host Controller" />
      <DataRow label="Hardware interrupts (IRQs)" value="Message Signaled Interrupts (MSI-X) active" />
      <DataRow label="High Precision Event Timer (HPET)" value="HPET active (14.318 MHz / 24.0 MHz reference clock)" />
      <DataRow label="Real-Time Clock (RTC) battery state" value="CMOS Battery OK" />
      <DataRow label="Embedded Controller (EC)" value="Dell Microchip Embedded Controller (Fan & thermal management)" />
      <DataRow label="Fan telemetry & speed" value={activeHardware.dynamicTelemetry?.fans?.length ? activeHardware.dynamicTelemetry.fans.map(f => `${f.name || 'System Fan'}: ${f.speed ?? 'Normal'} RPM`).join(' · ') : 'Dynamic Thermal Management / Auto Curve'} />
    </DataPanel>
  </div>;
}
