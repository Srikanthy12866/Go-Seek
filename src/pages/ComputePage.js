import { useEffect, useState } from 'react';
import ComputeDashboard from '../components/ComputeDashboard';
import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatBytes, formatFrequency, formatOptional, formatVoltage, unavailableReading } from '../lib/formatters';
import { fetchComputeData } from '../services/computeService';

export default function ComputePage() {
  const { hardware, frequencyHistory } = useHardware();
  const [menuData, setMenuData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchComputeData().then((data) => {
      if (mounted && data) setMenuData(data);
    });
    return () => { mounted = false; };
  }, []);

  const activeHardware = menuData ? { ...hardware, ...menuData } : hardware;
  if (!activeHardware) return null;
  if (activeHardware.runtime !== 'desktop') return <DataPanel title="Compute & graphics" icon="chip"><DataRow label="CPU" value={activeHardware.cpuThreads} /><DataRow label="Graphics" value={typeof activeHardware.graphics === 'string' ? activeHardware.graphics : (Array.isArray(activeHardware.graphics) ? activeHardware.graphics[0]?.model || 'Graphics adapter' : 'Integrated graphics')} /><DataRow label="Access" value="Detailed processor data requires the desktop app." /></DataPanel>;

  return <>
    <div className="metric-strip">
      <div className="metric"><span className="metric-label">PROCESSOR CORES</span><strong>{activeHardware.cpu?.logicalCores}</strong><span className="metric-foot">{activeHardware.cpu?.physicalCores || 'N/A'} PHYSICAL CORES</span><span className="metric-glyph">01</span></div>
      <div className="metric"><span className="metric-label">SYSTEM MEMORY</span><strong>{formatBytes(activeHardware.memory?.totalBytes)}</strong><span className="metric-foot">OS-REPORTED INSTALLED RAM</span><span className="metric-glyph">02</span></div>
      <div className="metric"><span className="metric-label">CPU SPEED · CURRENT</span><strong className="metric-resolution">{formatFrequency(activeHardware.cpu?.averageSpeedGhz)}</strong><span className="metric-foot">LIVE AVERAGE</span><span className="metric-glyph">03</span></div>
      <div className="metric"><span className="metric-label">GRAPHICS ADAPTERS</span><strong className="metric-online">{(activeHardware.graphics || []).length}</strong><span className="metric-foot">DETECTED CONTROLLERS</span><span className="metric-glyph">04</span></div>
    </div>
    <ComputeDashboard hardware={activeHardware} history={frequencyHistory} />
    <div className="panel-grid">
      <DataPanel title="Processor & live clocks" icon="chip">
        <DataRow label="Processor name / specification" value={activeHardware.soc?.name} />
        <DataRow label="Code name" value={formatOptional(activeHardware.soc?.codeName)} />
        <DataRow label="Vendor / package" value={`${activeHardware.soc?.manufacturer} · ${activeHardware.soc?.socket}`} />
        <DataRow label="Manufacturing process" value={formatOptional(activeHardware.soc?.processNode)} />
        <DataRow label="Max TDP" value={formatOptional(Number.isFinite(activeHardware.soc?.maxTdpWatts) ? `${activeHardware.soc?.maxTdpWatts} W` : activeHardware.soc?.maxTdpWatts)} />
        <DataRow label="Family / model / stepping" value={`${activeHardware.soc?.family} / ${activeHardware.soc?.model} / ${activeHardware.soc?.stepping}`} />
        <DataRow label="Extended family / extended model / model" value={activeHardware.soc?.extendedFamily == null ? unavailableReading : `${activeHardware.soc?.extendedFamily} / ${activeHardware.soc?.extendedModel} / ${(activeHardware.soc?.baseModel ?? 0).toString(16).toUpperCase()}`} />
        <DataRow label="Revision / voltage" value={`${activeHardware.soc?.revision || 'Not reported'} · ${formatVoltage(activeHardware.soc?.voltage)}`} />
        <DataRow label="Multiplier" value={formatOptional(Number.isFinite(activeHardware.soc?.multiplier) ? `× ${activeHardware.soc?.multiplier}` : activeHardware.soc?.multiplier)} />
        <DataRow label="Bus speed" value={formatOptional(Number.isFinite(activeHardware.soc?.busSpeedMhz) ? `${activeHardware.soc?.busSpeedMhz} MHz` : activeHardware.soc?.busSpeedMhz)} />
        <DataRow label="Platform link (FSB / QPI / UPI / DMI)" value={formatOptional(activeHardware.soc?.platformLink)} />
        <DataRow label="CPU architecture / operation modes" value={`${activeHardware.cpuInventory?.architecture || 'Not reported'} · ${activeHardware.cpuInventory?.operationModes || 'Not reported'}`} />
        <DataRow label="Vendor ID / byte order" value={`${activeHardware.cpuInventory?.vendorId || 'Not reported'} · ${activeHardware.cpuInventory?.byteOrder || 'Not reported'}`} />
        <DataRow label="Cores / threads" value={`${activeHardware.cpu?.physicalCores ?? 'N/A'} cores · ${activeHardware.cpu?.logicalCores} threads`} />
        <DataRow label="Socket topology" value={activeHardware.cpuInventory?.sockets != null ? `${activeHardware.cpuInventory.sockets} socket(s) · ${activeHardware.cpuInventory.coresPerSocket ?? 'N/A'} cores/socket · ${activeHardware.cpuInventory.threadsPerCore ?? 'N/A'} threads/core` : 'Not reported'} />
        <DataRow label="NUMA nodes / BogoMIPS" value={`${activeHardware.cpuInventory?.numaNodes ?? 'Not reported'} · ${activeHardware.cpuInventory?.bogoMips ?? 'Not reported'}`} />
        <DataRow label="Virtualization / hypervisor" value={`${activeHardware.cpuInventory?.virtualization || 'Not reported'} · ${activeHardware.cpuInventory?.hypervisorVendor || 'No hypervisor reported'}`} />
        <DataRow label="Min / current / max clock" value={`${formatFrequency(activeHardware.cpu?.minSpeedGhz)} · ${formatFrequency(activeHardware.cpu?.averageSpeedGhz)} · ${formatFrequency(activeHardware.cpu?.maxSpeedGhz)}`} />
        <DataRow label="Frequency governor" value={activeHardware.cpu?.governor} />
        <DataRow label="Current per-core frequency" value={activeHardware.cpu?.current?.length ? activeHardware.cpu.current.map((speed, index) => `C${index} ${formatFrequency(speed)}`).join(' · ') : 'Per-core readings unavailable'} />
        <DataRow label="Performance / efficiency cores" value={`${activeHardware.cpu?.performanceCores ?? 'N/A'} · ${activeHardware.cpu?.efficiencyCores ?? 'N/A'}`} />
        <DataRow label="Big.LITTLE / DynamIQ core clusters" value={activeHardware.cpuInventory?.smtSiblings?.length ? activeHardware.cpuInventory.smtSiblings.map(item => `${item.cpu}: cluster ${item.cluster ?? '0'}`).join(' · ') : `P-Cores: ${activeHardware.cpu?.performanceCores ?? 'N/A'} · E-Cores: ${activeHardware.cpu?.efficiencyCores ?? 'N/A'}`} />
        <DataRow label="Logical core / SMT topology" value={activeHardware.cpuInventory?.smtSiblings?.length ? activeHardware.cpuInventory.smtSiblings.map(item => `${item.cpu} [siblings ${item.siblings}]`).join(' · ') : `${activeHardware.cpu?.physicalCores ?? 'N/A'} physical · ${activeHardware.cpu?.logicalCores} logical`} />
        <DataRow label="CPU core online / offline state" value={`Online: ${activeHardware.cpuInventory?.onlineCpus || `0-${Math.max((activeHardware.cpu?.logicalCores || 1) - 1, 0)}`} · Offline: ${activeHardware.cpuInventory?.offlineCpus || 'None'}`} />
        <DataRow label="Base vs boost frequency" value={`${activeHardware.cpuInventory?.baseFrequencyMhz ? `${activeHardware.cpuInventory.baseFrequencyMhz} MHz` : formatFrequency(activeHardware.cpu?.minSpeedGhz)} · Boost ${activeHardware.cpuInventory?.boostFrequencyMhz ? `${activeHardware.cpuInventory.boostFrequencyMhz} MHz` : formatFrequency(activeHardware.cpu?.maxSpeedGhz)}${activeHardware.cpuInventory?.boostEnabled != null ? ` (${activeHardware.cpuInventory.boostEnabled ? 'enabled' : 'disabled'})` : ''}`} />
        <DataRow label="Supported instructions" value={activeHardware.soc?.instructions?.join(', ') || 'Not reported'} />
        <DataRow label="Hardware vulnerability mitigations" value={activeHardware.cpuInventory?.vulnerabilities?.length ? activeHardware.cpuInventory.vulnerabilities.join(' · ') : unavailableReading} />
        <DataRow label="Branch prediction & mispredicts (PMU)" value={activeHardware.cpuInventory?.pmuEvents?.length ? `PMU events: ${activeHardware.cpuInventory.pmuEvents.filter(e => e.includes('branch')).join(', ') || 'available'}` : unavailableReading} />
        <DataRow label="Instructions per cycle (IPC) counters" value={activeHardware.cpuInventory?.pmuEvents?.length ? `PMU events: ${activeHardware.cpuInventory.pmuEvents.filter(e => e.includes('instructions') || e.includes('cycles')).join(', ') || 'available'}` : unavailableReading} />
      </DataPanel>
      <DataPanel title="Cache hierarchy" icon="chip">
        <DataRow label="L1 data / instruction" value={`${formatBytes(activeHardware.cpu?.caches?.l1d)} / ${formatBytes(activeHardware.cpu?.caches?.l1i)}`} />
        <DataRow label="L2 cache" value={formatBytes(activeHardware.cpu?.caches?.l2)} />
        <DataRow label="L3 cache" value={formatBytes(activeHardware.cpu?.caches?.l3)} />
        <DataRow label="Cache topology summary" value={activeHardware.cpuInventory?.caches ? `L1d ${activeHardware.cpuInventory.caches.l1d || 'N/A'} · L1i ${activeHardware.cpuInventory.caches.l1i || 'N/A'} · L2 ${activeHardware.cpuInventory.caches.l2 || 'N/A'} · L3 ${activeHardware.cpuInventory.caches.l3 || 'N/A'}` : 'Not reported'} />
        <DataRow label="NUMA CPU map" value={activeHardware.cpuInventory?.numaCpuMap?.length ? activeHardware.cpuInventory.numaCpuMap.map(node => `Node ${node.node}: ${node.cpus}`).join(' · ') : 'Not reported'} />
        {(activeHardware.cpu?.cacheInstances || []).length ? activeHardware.cpu.cacheInstances.map((cache) => <DataRow key={`${cache.level}-${cache.type}-${cache.sharedCpuList}`} label={`L${cache.level} ${cache.type} descriptor`} value={[formatBytes(cache.sizeBytes), cache.ways ? `${cache.ways}-way` : null, cache.lineSizeBytes ? `${cache.lineSizeBytes}-byte line` : null, cache.sharedCpuList ? `CPUs ${cache.sharedCpuList}` : null].filter(Boolean).join(' · ')} />) : <DataRow label="Cache associativity / line size" value={unavailableReading} />}
        <DataRow label="CPU temperature" value={activeHardware.cpu?.temperatureC != null ? `${activeHardware.cpu.temperatureC} °C` : 'Sensor unavailable'} />
      </DataPanel>
      <DataPanel title="Graphics adapter" icon="display">
        {(activeHardware.graphics || []).length ? activeHardware.graphics.map((gpu, index) => <div key={`${gpu.model}-${index}`}>
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
          <DataRow label="VRAM allocation & bandwidth" value={activeHardware.dynamicTelemetry?.gpuHwmon?.[index]?.vramUsedBytes != null ? `${formatBytes(activeHardware.dynamicTelemetry.gpuHwmon[index].vramUsedBytes)} used of ${formatBytes(activeHardware.dynamicTelemetry.gpuHwmon[index].vramTotalBytes)}` : `${gpu.vram ? `${gpu.vram} MB` : 'Shared / dynamic'}`} />
          <DataRow label="GPU TDP & power draw" value={activeHardware.dynamicTelemetry?.gpuHwmon?.[index]?.powerWatts != null ? `${activeHardware.dynamicTelemetry.gpuHwmon[index].powerWatts} W` : unavailableReading} />
          <DataRow label="GPU thermal sensors (edge / junction / mem)" value={gpu.temperatureGpu != null ? `Edge ${gpu.temperatureGpu} °C` : unavailableReading} />
          <DataRow label="PCIe link generation & width" value={gpu.pciLink?.currentSpeed && gpu.pciLink?.currentWidth ? `${gpu.pciLink.currentSpeed} · x${gpu.pciLink.currentWidth} (max ${gpu.pciLink.maxSpeed || 'N/A'} · x${gpu.pciLink.maxWidth || 'N/A'})` : unavailableReading} />
          <DataRow label="GPU fan speed & PWM duty cycle" value={activeHardware.dynamicTelemetry?.gpuHwmon?.[index]?.fanRpm != null || activeHardware.dynamicTelemetry?.gpuHwmon?.[index]?.pwmDutyPercent != null ? `${activeHardware.dynamicTelemetry.gpuHwmon[index].fanRpm ?? 'N/A'} RPM · ${activeHardware.dynamicTelemetry.gpuHwmon[index].pwmDutyPercent ?? 'N/A'}% PWM` : unavailableReading} />
        </div>) : <DataRow label="Graphics" value="No controller details reported" />}
        <DataRow label="NPU / AI engine clock & utilization" value={activeHardware.staticTelemetry?.npuAccelerators?.length ? activeHardware.staticTelemetry.npuAccelerators.join(', ') : 'No dedicated NPU detected (/sys/class/accel)'} />
        <DataRow label="Hardware video encoder / decoder engines" value={(activeHardware.graphics || []).length ? `${(activeHardware.graphics || []).map(g => g.model || g.name).filter(Boolean).join(', ')} media engine (/sys/class/drm)` : unavailableReading} />
        <DataRow label="Multi-Instance GPU (MIG) slices" value={activeHardware.staticTelemetry?.migSlices?.length ? activeHardware.staticTelemetry.migSlices.join(', ') : 'Not enabled / unsupported on this GPU'} />
      </DataPanel>
      <DataPanel title="Firmware & sensors" icon="chip">
        <DataRow label="CPU microcode revision" value={activeHardware.cpu?.microcodeRevision} />
        <DataRow label="CPU temperature" value={activeHardware.cpu?.temperatureC != null ? `${activeHardware.cpu.temperatureC} °C` : 'Not reported'} />
        <DataRow label="Per-core temperatures" value={activeHardware.cpu?.perCoreTemperatureC?.length ? activeHardware.cpu.perCoreTemperatureC.map((value, index) => `C${index} ${value} °C`).join(' · ') : 'Not reported'} />
        <DataRow label="Die & board thermal zones" value={activeHardware.dynamicTelemetry?.thermalZones?.length ? activeHardware.dynamicTelemetry.thermalZones.map(z => `${z.zone} (${z.type}): ${z.tempC ?? 'N/A'} °C`).join(' · ') : 'Not reported'} />
        <DataRow label="Thermal trip points & actions" value={activeHardware.dynamicTelemetry?.thermalZones?.some(z => z.trips?.length) ? activeHardware.dynamicTelemetry.thermalZones.filter(z => z.trips?.length).map(z => `${z.zone} [${z.trips.join(', ')}]`).join(' · ') : 'Not reported'} />
        <DataRow label="Thermal cooling device states" value={activeHardware.dynamicTelemetry?.coolingDevices?.length ? activeHardware.dynamicTelemetry.coolingDevices.map(c => `${c.device} (${c.type}): ${c.curState ?? 0}/${c.maxState ?? 0}`).join(' · ') : 'Not reported'} />
        <DataRow label="Thermal throttling events" value={activeHardware.dynamicTelemetry?.coreThrottleCount != null || activeHardware.dynamicTelemetry?.packageThrottleCount != null ? `Core: ${activeHardware.dynamicTelemetry.coreThrottleCount ?? 0} · Package: ${activeHardware.dynamicTelemetry.packageThrottleCount ?? 0}` : '0 events reported'} />
        <DataRow label="Core & rail voltages" value={activeHardware.dynamicTelemetry?.hwmonVoltages?.length ? activeHardware.dynamicTelemetry.hwmonVoltages.join(' · ') : formatVoltage(activeHardware.soc?.voltage)} />
        {(activeHardware.sensors?.fans || []).map((fan, index) => <DataRow key={`fan-${index}`} label={fan.label || `Fan ${index + 1}`} value={`${fan.rpm} RPM${fan.pwmDutyPercent != null ? ` · ${fan.pwmDutyPercent}% PWM` : ''}${fan.controller ? ` · ${fan.controller}` : ''}`} />)}
        {!(activeHardware.sensors?.fans || []).length && <DataRow label="Fan speeds & PWM duty cycles" value="No active tachometer / PWM channels reported by hwmon" />}
      </DataPanel>
      <DataPanel title="CPU power & C-states" icon="chip">
        <DataRow label="Active scaling governor & driver" value={`${activeHardware.cpu?.governor || 'Not reported'}${activeHardware.cpuInventory?.scalingDriver ? ` · ${activeHardware.cpuInventory.scalingDriver}` : ''}`} />
        <DataRow label="CPU Speed Shift / HWP limits" value={activeHardware.cpuInventory?.scalingMinMhz && activeHardware.cpuInventory?.scalingMaxMhz ? `${activeHardware.cpuInventory.scalingMinMhz} MHz – ${activeHardware.cpuInventory.scalingMaxMhz} MHz` : `${formatFrequency(activeHardware.cpu?.minSpeedGhz)} – ${formatFrequency(activeHardware.cpu?.maxSpeedGhz)}`} />
        <DataRow label="Energy Performance Preference (EPP)" value={activeHardware.cpuInventory?.energyPreference || unavailableReading} />
        <DataRow label="Deep sleep C-state residency" value={activeHardware.dynamicTelemetry?.cpuidleStates?.length ? activeHardware.dynamicTelemetry.cpuidleStates.map(s => `${s.name}: ${s.residencyUs != null ? `${(s.residencyUs / 1e6).toFixed(1)}s` : 'N/A'}`).join(' · ') : unavailableReading} />
        <DataRow label="C-state latency thresholds" value={activeHardware.dynamicTelemetry?.cpuidleStates?.length ? activeHardware.dynamicTelemetry.cpuidleStates.map(s => `${s.name}: ${s.latencyUs ?? 'N/A'} µs`).join(' · ') : unavailableReading} />
        <DataRow label="Intel RAPL package energy" value={activeHardware.dynamicTelemetry?.raplPackageJoules != null ? `${activeHardware.dynamicTelemetry.raplPackageJoules} J` : 'RAPL counter restricted / unavailable'} />
        <DataRow label="DRAM subsystem RAPL energy" value={activeHardware.dynamicTelemetry?.raplDramJoules != null ? `${activeHardware.dynamicTelemetry.raplDramJoules} J` : 'RAPL DRAM domain restricted / unavailable'} />
        <DataRow label="CPU under-voltage / overclocking offsets (MSR)" value={activeHardware.staticTelemetry?.msrAccess || 'MSR interface restricted (/dev/cpu/*/msr)'} />
        <DataRow label="Clock tree & system clocksource" value={activeHardware.staticTelemetry?.clocksourceCurrent ? `Current: ${activeHardware.staticTelemetry.clocksourceCurrent} · Available: ${activeHardware.staticTelemetry.clocksourceAvailable || 'N/A'}` : unavailableReading} />
      </DataPanel>
      <DataPanel title="CPU benchmark" icon="chip">
        <DataRow label="Single-thread score" value={formatOptional(activeHardware.bench?.singleThread, 'Not measured')} />
        <DataRow label="Multi-thread score" value={formatOptional(activeHardware.bench?.multiThread, 'Not measured')} />
        <DataRow label="Reference CPU comparison" value={formatOptional(activeHardware.bench?.referenceComparison, 'Not measured')} />
        <DataRow label="Stress test" value={formatOptional(activeHardware.bench?.stressTest, 'Not run')} />
      </DataPanel>
    </div>
  </>;
}
