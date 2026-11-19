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
        <DataRow label="Big.LITTLE / DynamIQ core clusters" value={hardware.cpuInventory?.smtSiblings?.length ? hardware.cpuInventory.smtSiblings.map(item => `${item.cpu}: cluster ${item.cluster ?? '0'}`).join(' · ') : `P-Cores: ${hardware.cpu.performanceCores ?? 'N/A'} · E-Cores: ${hardware.cpu.efficiencyCores ?? 'N/A'}`} />
        <DataRow label="Logical core / SMT topology" value={hardware.cpuInventory?.smtSiblings?.length ? hardware.cpuInventory.smtSiblings.map(item => `${item.cpu} [siblings ${item.siblings}]`).join(' · ') : `${hardware.cpu.physicalCores ?? 'N/A'} physical · ${hardware.cpu.logicalCores} logical`} />
        <DataRow label="CPU core online / offline state" value={`Online: ${hardware.cpuInventory?.onlineCpus || `0-${Math.max((hardware.cpu.logicalCores || 1) - 1, 0)}`} · Offline: ${hardware.cpuInventory?.offlineCpus || 'None'}`} />
        <DataRow label="Base vs boost frequency" value={`${hardware.cpuInventory?.baseFrequencyMhz ? `${hardware.cpuInventory.baseFrequencyMhz} MHz` : formatFrequency(hardware.cpu.minSpeedGhz)} · Boost ${hardware.cpuInventory?.boostFrequencyMhz ? `${hardware.cpuInventory.boostFrequencyMhz} MHz` : formatFrequency(hardware.cpu.maxSpeedGhz)}${hardware.cpuInventory?.boostEnabled != null ? ` (${hardware.cpuInventory.boostEnabled ? 'enabled' : 'disabled'})` : ''}`} />
        <DataRow label="Supported instructions" value={hardware.soc.instructions?.join(', ') || 'Not reported'} />
        <DataRow label="Hardware vulnerability mitigations" value={hardware.cpuInventory?.vulnerabilities?.length ? hardware.cpuInventory.vulnerabilities.join(' · ') : unavailableReading} />
        <DataRow label="Branch prediction & mispredicts (PMU)" value={hardware.cpuInventory?.pmuEvents?.length ? `PMU events: ${hardware.cpuInventory.pmuEvents.filter(e => e.includes('branch')).join(', ') || 'available'}` : unavailableReading} />
        <DataRow label="Instructions per cycle (IPC) counters" value={hardware.cpuInventory?.pmuEvents?.length ? `PMU events: ${hardware.cpuInventory.pmuEvents.filter(e => e.includes('instructions') || e.includes('cycles')).join(', ') || 'available'}` : unavailableReading} />
      </DataPanel>
      <DataPanel title="Cache hierarchy" icon="chip">
        <DataRow label="L1 data / instruction" value={`${formatBytes(hardware.cpu.caches.l1d)} / ${formatBytes(hardware.cpu.caches.l1i)}`} />
        <DataRow label="L2 cache" value={formatBytes(hardware.cpu.caches.l2)} />
        <DataRow label="L3 cache" value={formatBytes(hardware.cpu.caches.l3)} />
        <DataRow label="Cache topology summary" value={hardware.cpuInventory?.caches ? `L1d ${hardware.cpuInventory.caches.l1d || 'N/A'} · L1i ${hardware.cpuInventory.caches.l1i || 'N/A'} · L2 ${hardware.cpuInventory.caches.l2 || 'N/A'} · L3 ${hardware.cpuInventory.caches.l3 || 'N/A'}` : 'Not reported'} />
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
          <DataRow label="VRAM allocation & bandwidth" value={hardware.dynamicTelemetry?.gpuHwmon?.[index]?.vramUsedBytes != null ? `${formatBytes(hardware.dynamicTelemetry.gpuHwmon[index].vramUsedBytes)} used of ${formatBytes(hardware.dynamicTelemetry.gpuHwmon[index].vramTotalBytes)}` : `${gpu.vram ? `${gpu.vram} MB` : 'Shared / dynamic'}`} />
          <DataRow label="GPU TDP & power draw" value={hardware.dynamicTelemetry?.gpuHwmon?.[index]?.powerWatts != null ? `${hardware.dynamicTelemetry.gpuHwmon[index].powerWatts} W` : unavailableReading} />
          <DataRow label="GPU thermal sensors (edge / junction / mem)" value={gpu.temperatureGpu != null ? `Edge ${gpu.temperatureGpu} °C` : unavailableReading} />
          <DataRow label="PCIe link generation & width" value={gpu.pciLink?.currentSpeed && gpu.pciLink?.currentWidth ? `${gpu.pciLink.currentSpeed} · x${gpu.pciLink.currentWidth} (max ${gpu.pciLink.maxSpeed || 'N/A'} · x${gpu.pciLink.maxWidth || 'N/A'})` : unavailableReading} />
          <DataRow label="GPU fan speed & PWM duty cycle" value={hardware.dynamicTelemetry?.gpuHwmon?.[index]?.fanRpm != null || hardware.dynamicTelemetry?.gpuHwmon?.[index]?.pwmDutyPercent != null ? `${hardware.dynamicTelemetry.gpuHwmon[index].fanRpm ?? 'N/A'} RPM · ${hardware.dynamicTelemetry.gpuHwmon[index].pwmDutyPercent ?? 'N/A'}% PWM` : unavailableReading} />
        </div>) : <DataRow label="Graphics" value="No controller details reported" />}
        <DataRow label="NPU / AI engine clock & utilization" value={hardware.staticTelemetry?.npuAccelerators?.length ? hardware.staticTelemetry.npuAccelerators.join(', ') : 'No dedicated NPU detected (/sys/class/accel)'} />
        <DataRow label="Hardware video encoder / decoder engines" value={hardware.graphics.length ? `${hardware.graphics.map(g => g.model || g.name).filter(Boolean).join(', ')} media engine (/sys/class/drm)` : unavailableReading} />
        <DataRow label="Multi-Instance GPU (MIG) slices" value={hardware.staticTelemetry?.migSlices?.length ? hardware.staticTelemetry.migSlices.join(', ') : 'Not enabled / unsupported on this GPU'} />
      </DataPanel>
      <DataPanel title="Firmware & sensors" icon="chip">
        <DataRow label="CPU microcode revision" value={hardware.cpu.microcodeRevision} />
        <DataRow label="CPU temperature" value={hardware.cpu.temperatureC != null ? `${hardware.cpu.temperatureC} °C` : 'Not reported'} />
        <DataRow label="Per-core temperatures" value={hardware.cpu.perCoreTemperatureC?.length ? hardware.cpu.perCoreTemperatureC.map((value, index) => `C${index} ${value} °C`).join(' · ') : 'Not reported'} />
        <DataRow label="Die & board thermal zones" value={hardware.dynamicTelemetry?.thermalZones?.length ? hardware.dynamicTelemetry.thermalZones.map(z => `${z.zone} (${z.type}): ${z.tempC ?? 'N/A'} °C`).join(' · ') : 'Not reported'} />
        <DataRow label="Thermal trip points & actions" value={hardware.dynamicTelemetry?.thermalZones?.some(z => z.trips?.length) ? hardware.dynamicTelemetry.thermalZones.filter(z => z.trips?.length).map(z => `${z.zone} [${z.trips.join(', ')}]`).join(' · ') : 'Not reported'} />
        <DataRow label="Thermal cooling device states" value={hardware.dynamicTelemetry?.coolingDevices?.length ? hardware.dynamicTelemetry.coolingDevices.map(c => `${c.device} (${c.type}): ${c.curState ?? 0}/${c.maxState ?? 0}`).join(' · ') : 'Not reported'} />
        <DataRow label="Thermal throttling events" value={hardware.dynamicTelemetry?.coreThrottleCount != null || hardware.dynamicTelemetry?.packageThrottleCount != null ? `Core: ${hardware.dynamicTelemetry.coreThrottleCount ?? 0} · Package: ${hardware.dynamicTelemetry.packageThrottleCount ?? 0}` : '0 events reported'} />
        <DataRow label="Core & rail voltages" value={hardware.dynamicTelemetry?.hwmonVoltages?.length ? hardware.dynamicTelemetry.hwmonVoltages.join(' · ') : formatVoltage(hardware.soc.voltage)} />
        {(hardware.sensors?.fans || []).map((fan, index) => <DataRow key={`fan-${index}`} label={fan.label || `Fan ${index + 1}`} value={`${fan.rpm} RPM${fan.pwmDutyPercent != null ? ` · ${fan.pwmDutyPercent}% PWM` : ''}${fan.controller ? ` · ${fan.controller}` : ''}`} />)}
        {!(hardware.sensors?.fans || []).length && <DataRow label="Fan speeds & PWM duty cycles" value="No active tachometer / PWM channels reported by hwmon" />}
      </DataPanel>
      <DataPanel title="CPU power & C-states" icon="chip">
        <DataRow label="Active scaling governor & driver" value={`${hardware.cpu.governor || 'Not reported'}${hardware.cpuInventory?.scalingDriver ? ` · ${hardware.cpuInventory.scalingDriver}` : ''}`} />
        <DataRow label="CPU Speed Shift / HWP limits" value={hardware.cpuInventory?.scalingMinMhz && hardware.cpuInventory?.scalingMaxMhz ? `${hardware.cpuInventory.scalingMinMhz} MHz – ${hardware.cpuInventory.scalingMaxMhz} MHz` : `${formatFrequency(hardware.cpu.minSpeedGhz)} – ${formatFrequency(hardware.cpu.maxSpeedGhz)}`} />
        <DataRow label="Energy Performance Preference (EPP)" value={hardware.cpuInventory?.energyPreference || unavailableReading} />
        <DataRow label="Deep sleep C-state residency" value={hardware.dynamicTelemetry?.cpuidleStates?.length ? hardware.dynamicTelemetry.cpuidleStates.map(s => `${s.name}: ${s.residencyUs != null ? `${(s.residencyUs / 1e6).toFixed(1)}s` : 'N/A'}`).join(' · ') : unavailableReading} />
        <DataRow label="C-state latency thresholds" value={hardware.dynamicTelemetry?.cpuidleStates?.length ? hardware.dynamicTelemetry.cpuidleStates.map(s => `${s.name}: ${s.latencyUs ?? 'N/A'} µs`).join(' · ') : unavailableReading} />
        <DataRow label="Intel RAPL package energy" value={hardware.dynamicTelemetry?.raplPackageJoules != null ? `${hardware.dynamicTelemetry.raplPackageJoules} J` : 'RAPL counter restricted / unavailable'} />
        <DataRow label="DRAM subsystem RAPL energy" value={hardware.dynamicTelemetry?.raplDramJoules != null ? `${hardware.dynamicTelemetry.raplDramJoules} J` : 'RAPL DRAM domain restricted / unavailable'} />
        <DataRow label="CPU under-voltage / overclocking offsets (MSR)" value={hardware.staticTelemetry?.msrAccess || 'MSR interface restricted (/dev/cpu/*/msr)'} />
        <DataRow label="Clock tree & system clocksource" value={hardware.staticTelemetry?.clocksourceCurrent ? `Current: ${hardware.staticTelemetry.clocksourceCurrent} · Available: ${hardware.staticTelemetry.clocksourceAvailable || 'N/A'}` : unavailableReading} />
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