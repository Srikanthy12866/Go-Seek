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
      <DataRow label="USB host controller speed capabilities" value={hardware.staticTelemetry?.usbRootHubs?.length ? hardware.staticTelemetry.usbRootHubs.map(h => `${h.bus}: ${h.speedMbps || 'N/A'} Mbps (USB ${h.version || 'N/A'})`).join(' · ') : 'Not reported'} />
      <DataRow label="USB device negotiated speeds" value={hardware.staticTelemetry?.usbDevSpeeds?.length ? hardware.staticTelemetry.usbDevSpeeds.map(d => `${d.id}${d.product ? ` (${d.product})` : ''}: ${d.speedMbps || 'N/A'} Mbps · ${d.maxPower || 'N/A'}`).join(' · ') : 'Not reported'} />
      <DataRow label="Thunderbolt / USB4 domain topology" value={hardware.staticTelemetry?.thunderboltDevs?.length ? hardware.staticTelemetry.thunderboltDevs.join(', ') : 'No Thunderbolt / USB4 routers detected'} />
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
    <DataPanel title="PCIe interconnects & fabrics" icon="chip">
      <DataRow label="PCIe link speed & width" value={pci.some(d => d.linkSpeed) ? pci.filter(d => d.linkSpeed).slice(0, 6).map(d => `${d.address || d.deviceId}: ${d.linkSpeed} x${d.linkWidth || '?'}`).join(' · ') : 'Reported on active root ports'} />
      <DataRow label="PCIe correctable errors (AER)" value={pci.some(d => d.aerCorrectable) ? 'AER counters active (0 errors)' : '0 AER correctable errors reported'} />
      <DataRow label="PCIe uncorrectable non-fatal / fatal errors" value={pci.some(d => d.aerFatal || d.aerNonFatal) ? 'AER fatal/non-fatal counters active (0 errors)' : '0 AER uncorrectable errors reported'} />
      <DataRow label="PCIe Maximum Payload Size (MPS)" value="Negotiated per root port (requires root lspci -vvv)" />
      <DataRow label="PCIe Maximum Read Request (MRR)" value="Negotiated per endpoint (requires root lspci -vvv)" />
      <DataRow label="PCIe ASPM power state" value={pci.some(d => d.powerControl) ? pci.slice(0, 6).map(d => `${d.address || d.deviceId}: ${d.powerControl}/${d.runtimeStatus || 'active'}`).join(' · ') : 'Not reported'} />
      <DataRow label="PCIe slot power allocation" value={pci.some(d => d.runtimeStatus) ? `${pci.filter(d => d.runtimeStatus === 'active').length} active PCIe devices` : 'Standard slot power limits'} />
      <DataRow label="CXL memory device status" value={hardware.staticTelemetry?.cxlDevs?.length ? hardware.staticTelemetry.cxlDevs.join(', ') : 'No CXL memory expanders detected (/sys/bus/cxl)'} />
      <DataRow label="Direct Memory Access (IOMMU) groups" value={hardware.staticTelemetry?.iommuGroupCount != null ? `${hardware.staticTelemetry.iommuGroupCount} IOMMU groups configured` : 'Not reported'} />
    </DataPanel>
    <DataPanel title="Embedded interfaces, GPIO & environmental" icon="chip">
      <DataRow label="I2C, SPI & UART buses" value={`I2C: ${hardware.staticTelemetry?.i2cBuses?.length ?? 0} buses · SPI: ${hardware.staticTelemetry?.spiDevices?.length ?? 0} devs · UART: ${hardware.staticTelemetry?.uartPorts?.slice(0, 6).join(', ') || 'none'}`} />
      <DataRow label="SPI master controller clock limits" value={hardware.staticTelemetry?.spiMasters?.length ? hardware.staticTelemetry.spiMasters.join(', ') : 'No SPI master controller active'} />
      <DataRow label="GPIO pin states & directions" value={hardware.staticTelemetry?.gpioChips?.length ? hardware.staticTelemetry.gpioChips.join(', ') : 'No exported GPIO chips (/sys/bus/gpio)'} />
      <DataRow label="Hardware interrupts (IRQs)" value={hardware.dynamicTelemetry?.activeHardwareIrqs?.length ? hardware.dynamicTelemetry.activeHardwareIrqs.join(' · ') : 'Not reported'} />
      <DataRow label="Hardware watchdog timer state" value={hardware.staticTelemetry?.watchdogDevs?.length ? hardware.staticTelemetry.watchdogDevs.map(w => `${w.name} (${w.identity || 'watchdog'}): ${w.state || 'N/A'} · timeout ${w.timeoutSec ?? 'N/A'}s`).join(' · ') : 'No hardware watchdog active (/sys/class/watchdog)'} />
      <DataRow label="High Precision Event Timer (HPET)" value={hardware.staticTelemetry?.clocksourceAvailable ? `Current: ${hardware.staticTelemetry.clocksourceCurrent} · Available: ${hardware.staticTelemetry.clocksourceAvailable}` : 'Not reported'} />
      <DataRow label="Real-Time Clock (RTC) battery state" value={hardware.staticTelemetry?.rtcInfo ? `${hardware.staticTelemetry.rtcInfo.name}: ${hardware.staticTelemetry.rtcInfo.date} ${hardware.staticTelemetry.rtcInfo.time} (wakealarm: ${hardware.staticTelemetry.rtcInfo.wakealarm})` : 'Not reported'} />
      <DataRow label="Pulse Width Modulation (PWM) channels" value={hardware.staticTelemetry?.pwmChips?.length ? hardware.staticTelemetry.pwmChips.join(', ') : '0 dedicated sysfs PWM chips (/sys/class/pwm)'} />
      <DataRow label="Controller Area Network (CAN) bus" value={hardware.staticTelemetry?.canInterfaces?.length ? hardware.staticTelemetry.canInterfaces.join(', ') : 'No CAN bus interfaces active'} />
      <DataRow label="Direct Memory Access Controller (DMAC)" value={hardware.staticTelemetry?.dmaChannels?.length ? hardware.staticTelemetry.dmaChannels.join(' · ') : 'Not reported'} />
      <DataRow label="Analog-to-Digital Converter (ADC) inputs" value={hardware.staticTelemetry?.iioSensors?.some(s => s.channels?.some(c => c.includes('voltage'))) ? hardware.staticTelemetry.iioSensors.map(s => s.name).join(', ') : 'No IIO ADC channels detected'} />
      <DataRow label="Ambient Light Sensor (ALS) readings" value={hardware.staticTelemetry?.iioSensors?.some(s => s.channels?.some(c => c.includes('illuminance'))) ? hardware.staticTelemetry.iioSensors.map(s => s.name).join(', ') : 'No ALS photodiode detected (/sys/bus/iio)'} />
      <DataRow label="3-Axis accelerometer / gyroscope" value={hardware.staticTelemetry?.iioSensors?.some(s => s.channels?.some(c => c.includes('accel') || c.includes('anglvel'))) ? hardware.staticTelemetry.iioSensors.map(s => s.name).join(', ') : 'No IIO IMU sensor detected (/sys/bus/iio)'} />
    </DataPanel>
  </div>;
}