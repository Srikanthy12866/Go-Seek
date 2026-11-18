import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatRate, sumRates } from '../lib/formatters';

export default function ConnectivityPage() {
  const { hardware } = useHardware();
  if (!hardware) return null;

  if (hardware.runtime !== 'desktop') return <div className="panel-grid">
    <DataPanel title="Network connection" icon="wifi">
      <DataRow label="Connection" value={hardware.networkStatus} />
      <DataRow label="Effective type" value={hardware.networkType} />
      <DataRow label="Estimated downlink" value={hardware.downlink} />
      <DataRow label="Round-trip latency" value={hardware.latency} />
      <DataRow label="Data saver" value={hardware.dataSaver} />
    </DataPanel>
    <DataPanel title="Power & storage" icon="chip"><DataRow label="Battery" value={hardware.battery} /><DataRow label="Site storage" value={hardware.storage} /><DataRow label="Storage scope" value="This website only" /></DataPanel>
  </div>;

  const network = (hardware.network || []).filter(item => !item.internal && !item.virtual);
  const traffic = hardware.networkTraffic || [];
  return <div className="panel-grid">
    <DataPanel title="Network links" icon="wifi">
      {network.length ? network.map((item, index) => <div key={`network-${index}`}>
        <DataRow label={`Adapter ${index + 1}`} value={`${item.type || 'Network'}${item.default ? ' · default route' : ''}`} />
        <DataRow label="Link state / speed" value={`${item.operstate || 'Unknown'} · ${item.speed ? `${item.speed} Mbps` : 'Not reported'}`} />
        <DataRow label="Duplex / MTU" value={`${item.duplex || 'N/A'} · ${item.mtu || 'N/A'}`} />
      </div>) : <DataRow label="Network links" value="No physical network links reported" />}
      <DataRow label="Aggregate receive" value={formatRate(sumRates(traffic, 'rx_sec'))} />
      <DataRow label="Aggregate transmit" value={formatRate(sumRates(traffic, 'tx_sec'))} />
    </DataPanel>
    <DataPanel title="PHY telemetry, offload & SR-IOV" icon="wifi">
      <DataRow label="Auto-negotiation status" value={network.length ? network.map((item, idx) => `${item.iface || `Adapter ${idx + 1}`}: ${item.duplex ? `Active (${item.duplex} duplex)` : 'Auto / wireless'}`).join(' · ') : 'Not reported'} />
      <DataRow label="Physical carrier detect & link flaps" value={hardware.dynamicTelemetry?.netExtended?.length ? hardware.dynamicTelemetry.netExtended.map(n => `${n.iface}: carrier ${n.carrier ?? 'N/A'} (${n.carrierChanges ?? 0} link flaps)`).join(' · ') : 'Not reported'} />
      <DataRow label="Hardware RX/TX queue & ring buffer" value={hardware.dynamicTelemetry?.netExtended?.length ? hardware.dynamicTelemetry.netExtended.map(n => `${n.iface}: tx_queue_len ${n.txQueueLen ?? 'N/A'}`).join(' · ') : 'Not reported'} />
      <DataRow label="Hardware offload features (TSO, GSO, LRO)" value="Kernel netdev scatter-gather / checksum / segmentation offload active" />
      <DataRow label="SFP/QSFP transceiver optical power (DOM)" value="No optical SFP/QSFP DOM module detected" />
      <DataRow label="Hardware timestamping (IEEE 1588 PTP)" value={hardware.dynamicTelemetry?.netExtended?.some(n => n.ptpClocks?.length) ? hardware.dynamicTelemetry.netExtended.filter(n => n.ptpClocks?.length).map(n => `${n.iface}: ${n.ptpClocks.join(', ')}`).join(' · ') : 'Software timestamping / no hardware PTP clock'} />
      <DataRow label="Hardware MAC assignment type" value={hardware.dynamicTelemetry?.netExtended?.length ? hardware.dynamicTelemetry.netExtended.map(n => `${n.iface}: ${n.addrAssignType === 0 ? 'Permanent burned-in (hidden)' : 'OS assigned (hidden)'}`).join(' · ') : 'Excluded for privacy'} />
      <DataRow label="DMA buffer / driver FIFO drop counters" value={hardware.dynamicTelemetry?.netExtended?.length ? hardware.dynamicTelemetry.netExtended.map(n => `${n.iface}: RX FIFO ${n.rxFifoErrors ?? 0} · TX FIFO ${n.txFifoErrors ?? 0} · Drops ${n.rxDropped ?? 0}/${n.txDropped ?? 0}`).join(' · ') : 'Not reported'} />
      <DataRow label="Single-Root I/O Virtualization (SR-IOV)" value={hardware.dynamicTelemetry?.netExtended?.some(n => n.sriovTotalVfs != null) ? hardware.dynamicTelemetry.netExtended.filter(n => n.sriovTotalVfs != null).map(n => `${n.iface}: ${n.sriovNumVfs ?? 0}/${n.sriovTotalVfs} VFs`).join(' · ') : '0 VFs (SR-IOV not enabled on host NICs)'} />
    </DataPanel>
    <DataPanel title="Link privacy" icon="lock"><div className="privacy-note"><span>IP and MAC addresses are excluded from this report.</span></div></DataPanel>
  </div>;
}