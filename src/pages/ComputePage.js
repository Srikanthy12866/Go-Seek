import ComputeDashboard from '../components/ComputeDashboard';
import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatBytes, formatFrequency, formatOptional, formatVoltage, unavailableReading } from '../lib/formatters';

export default function ComputePage() {
  const { hardware, frequencyHistory } = useHardware();
  if (!hardware) return null;
  if (hardware.runtime !== 'desktop') return <DataPanel title="Compute & graphics" icon="chip"><DataRow label="CPU" value={hardware.cpuThreads} /><DataRow label="Graphics" value={hardware.graphics} /><DataRow label="Access" value="Detailed processor data requires the desktop app." /></DataPanel>;

  return <>
    <div className="metric-strip">
      <div className="metric"><span className="metric-label">PROCESSOR CORES</span><strong>{hardware.cpu.logicalCores}</strong><span className="metric-foot">{hardware.cpu.physicalCores || 'N/A'} PHYSICAL CORES</span><span className="metric-glyph">01</span></div>
      <div className="metric"><span className="metric-label">SYSTEM MEMORY</span><strong>{formatBytes(hardware.memory.totalBytes)}</strong><span className="metric-foot">OS-REPORTED INSTALLED RAM</span><span className="metric-glyph">02</span></div>
      <div className="metric"><span className="metric-label">CPU SPEED · CURRENT</span><strong className="metric-resolution">{formatFrequency(hardware.cpu.averageSpeedGhz)}</strong><span className="metric-foot">LIVE AVERAGE</span><span className="metric-glyph">03</span></div>
      <div className="metric"><span className="metric-label">GRAPHICS ADAPTERS</span><strong className="metric-online">{hardware.graphics.length}</strong><span className="metric-foot">DETECTED CONTROLLERS</span><span className="metric-glyph">04</span></div>
    </div>
    <ComputeDashboard hardware={hardware} history={frequencyHistory} />
    <div className="panel-grid">
      <DataPanel title="Processor & live clocks" icon="chip">
        <DataRow label="Processor name / specification" value={hardware.soc.name} />
        <DataRow label="Code name" value={formatOptional(hardware.soc.codeName)} />
        <DataRow label="Vendor / package" value={`${hardware.soc.manufacturer} · ${hardware.soc.socket}`} />
        <DataRow label="Manufacturing process" value={formatOptional(hardware.soc.processNode)} />
        <DataRow label="Max TDP" value={formatOptional(Number.isFinite(hardware.soc.maxTdpWatts) ? `${hardware.soc.maxTdpWatts} W` : hardware.soc.maxTdpWatts)} />
        <DataRow label="Family / model / stepping" value={`${hardware.soc.family} / ${hardware.soc.model} / ${hardware.soc.stepping}`} />
        <DataRow label="Extended family / extended model / model" value={hardware.soc.extendedFamily == null ? unavailableReading : `${hardware.soc.extendedFamily} / ${hardware.soc.extendedModel} / ${(hardware.soc.baseModel ?? 0).toString(16).toUpperCase()}`} />
        <DataRow label="Revision / voltage" value={`${hardware.soc.revision || 'Not reported'} · ${formatVoltage(hardware.soc.voltage)}`} />
        <DataRow label="Multiplier" value={formatOptional(Number.isFinite(hardware.soc.multiplier) ? `× ${hardware.soc.multiplier}` : hardware.soc.multiplier)} />
        <DataRow label="Bus speed" value={formatOptional(Number.isFinite(hardware.soc.busSpeedMhz) ? `${hardware.soc.busSpeedMhz} MHz` : hardware.soc.busSpeedMhz)} />
        <DataRow label="Platform link (FSB / QPI / UPI / DMI)" value={formatOptional(hardware.soc.platformLink)} />
        <DataRow label="CPU architecture / operation modes" value={`${hardware.cpuInventory?.architecture || 'Not reported'} · ${hardware.cpuInventory?.operationModes || 'Not reported'}`} />
        <DataRow label="Vendor ID / byte order" value={`${hardware.cpuInventory?.vendorId || 'Not reported'} · ${hardware.cpuInventory?.byteOrder || 'Not reported'}`} />
        <DataRow label="Cores / threads" value={`${hardware.cpu.physicalCores ?? 'N/A'} cores · ${hardware.cpu.logicalCores} threads`} />
        <DataRow label="Socket topology" value={hardware.cpuInventory?.sockets != null ? `${hardware.cpuInventory.sockets} socket(s) · ${hardware.cpuInventory.coresPerSocket ?? 'N/A'} cores/socket · ${hardware.cpuInventory.threadsPerCore ?? 'N/A'} threads/core` : 'Not reported'} />
        <DataRow label="NUMA nodes / BogoMIPS" value={`${hardware.cpuInventory?.numaNodes ?? 'Not reported'} · ${hardware.cpuInventory?.bogoMips ?? 'Not reported'}`} />
        <DataRow label="Virtualization / hypervisor" value={`${hardware.cpuInventory?.virtualization || 'Not reported'} · ${hardware.cpuInventory?.hypervisorVendor || 'No hypervisor reported'}`} />
        <DataRow label="Min / current / max clock" value={`${formatFrequency(hardware.cpu.minSpeedGhz)} · ${formatFrequency(hardware.cpu.averageSpeedGhz)} · ${formatFrequency(hardware.cpu.maxSpeedGhz)}`} />
        <DataRow label="Frequency governor" value={hardware.cpu.governor} />
        <DataRow label="Current per-core frequency" value={hardware.cpu.current.length ? hardware.cpu.current.map((speed, index) => `C${index} ${formatFrequency(speed)}`).join(' · ') : 'Per-core readings unavailable'} />
        <DataRow label="Performance / efficiency cores" value={`${hardware.cpu.performanceCores ?? 'N/A'} · ${hardware.cpu.efficiencyCores ?? 'N/A'}`} />
        <DataRow label="Supported instructions" value={hardware.soc.instructions?.join(', ') || 'Not reported'} />
      </DataPanel>
      <DataPanel title="Cache hierarchy" icon="chip">
        <DataRow label="L1 data / instruction" value={`${formatBytes(hardware.cpu.caches.l1d)} / ${formatBytes(hardware.cpu.caches.l1i)}`} />
        <DataRow label="L2 cache" value={formatBytes(hardware.cpu.caches.l2)} />
        <DataRow label="L3 cache" value={formatBytes(hardware.cpu.caches.l3)} />
        <DataRow label="Linux cache summary" value={hardware.cpuInventory?.caches ? `L1d ${hardware.cpuInventory.caches.l1d || 'N/A'} · L1i ${hardware.cpuInventory.caches.l1i || 'N/A'} · L2 ${hardware.cpuInventory.caches.l2 || 'N/A'} · L3 ${hardware.cpuInventory.caches.l3 || 'N/A'}` : 'Not reported'} />
        <DataRow label="NUMA CPU map" value={hardware.cpuInventory?.numaCpuMap?.length ? hardware.cpuInventory.numaCpuMap.map(node => `Node ${node.node}: ${node.cpus}`).join(' · ') : 'Not reported'} />
        {(hardware.cpu.cacheInstances || []).length ? hardware.cpu.cacheInstances.map((cache) => <DataRow key={`${cache.level}-${cache.type}-${cache.sharedCpuList}`} label={`L${cache.level} ${cache.type} descriptor`} value={[formatBytes(cache.sizeBytes), cache.ways ? `${cache.ways}-way` : null, cache.lineSizeBytes ? `${cache.lineSizeBytes}-byte line` : null, cache.sharedCpuList ? `CPUs ${cache.sharedCpuList}` : null].filter(Boolean).join(' · ')} />) : <DataRow label="Cache associativity / line size" value={unavailableReading} />}
        <DataRow label="CPU temperature" value={hardware.cpu.temperatureC != null ? `${hardware.cpu.temperatureC} °C` : 'Sensor unavailable'} />
      </DataPanel>
      <DataPanel title="Graphics adapter" icon="display">
        {hardware.graphics.length ? hardware.graphics.map((gpu, index) => <div key={`${gpu.model}-${index}`}>
          <DataRow label={`GPU ${index + 1}`} value={`${gpu.vendor || ''} ${gpu.model || gpu.name || 'Unknown model'}`} />
          <DataRow label="Board vendor / VRAM" value={`${gpu.subVendor || 'Not reported'} · ${gpu.vram ? `${gpu.vram} MB` : 'Shared / unavailable'}${gpu.vramDynamic ? ' (dynamic)' : ''}`} />
          <DataRow label="Bus / PCI ID" value={`${gpu.bus || 'Not reported'} · ${gpu.pciID || gpu.busAddress || 'Not reported'}`} mono />
          <DataRow label="Core / memory clock" value={`${gpu.clockCore ? `${gpu.clockCore} MHz` : 'Not reported'} · ${gpu.clockMemory ? `${gpu.clockMemory} MHz` : 'Not reported'}`} />
          <DataRow label="Driver / temperature" value={`${gpu.driverVersion || 'Not reported'} · ${gpu.temperatureGpu != null ? `${gpu.temperatureGpu} °C` : 'Not reported'}`} />
          <DataRow label="GPU code name" value={formatOptional(gpu.codeName)} />
          <DataRow label="GPU technology / die size" value={`${formatOptional(gpu.technology)} · ${formatOptional(gpu.dieSize)}`} />
          <DataRow label="Transistor count / release date" value={`${formatOptional(gpu.transistorCount)} · ${formatOptional(gpu.releaseDate)}`} />
          <DataRow label="Shaders / TMUs / ROPs" value={`${formatOptional(gpu.shaders)} · ${formatOptional(gpu.tmus)} · ${formatOptional(gpu.rops)}`} />
          <DataRow label="Memory type / bus width" value={`${formatOptional(gpu.memoryType)} · ${formatOptional(Number.isFinite(gpu.memoryBusWidthBits) ? `${gpu.memoryBusWidthBits}-bit` : gpu.memoryBusWidthBits)}`} />
          <DataRow label="Shader clock" value={formatOptional(Number.isFinite(gpu.shaderClockMhz) ? `${gpu.shaderClockMhz} MHz` : gpu.shaderClockMhz)} />
          <DataRow label="GPU BIOS version" value={formatOptional(gpu.biosVersion)} />
        </div>) : <DataRow label="Graphics" value="No controller details reported" />}
      </DataPanel>
      <DataPanel title="Firmware & sensors" icon="chip">
        <DataRow label="CPU microcode revision" value={hardware.cpu.microcodeRevision} />
        <DataRow label="CPU temperature" value={hardware.cpu.temperatureC != null ? `${hardware.cpu.temperatureC} °C` : 'Not reported'} />
        <DataRow label="Per-core temperatures" value={hardware.cpu.perCoreTemperatureC?.length ? hardware.cpu.perCoreTemperatureC.map((value, index) => `C${index} ${value} °C`).join(' · ') : 'Not reported'} />
        {(hardware.sensors?.fans || []).map((fan, index) => <DataRow key={`fan-${index}`} label={fan.label || `Fan ${index + 1}`} value={`${fan.rpm} RPM${fan.controller ? ` · ${fan.controller}` : ''}`} />)}
      </DataPanel>
      <DataPanel title="CPU benchmark" icon="chip">
        <DataRow label="Single-thread score" value={formatOptional(hardware.bench?.singleThread, 'Not measured')} />
        <DataRow label="Multi-thread score" value={formatOptional(hardware.bench?.multiThread, 'Not measured')} />
        <DataRow label="Reference CPU comparison" value={formatOptional(hardware.bench?.referenceComparison, 'Not measured')} />
        <DataRow label="Stress test" value={formatOptional(hardware.bench?.stressTest, 'Not run')} />
      </DataPanel>
    </div>
  </>;
}