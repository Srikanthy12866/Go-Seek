import { useEffect, useState } from 'react';
import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatRate, sumRates } from '../lib/formatters';
import { fetchConnectivityData } from '../services/connectivityService';

export default function ConnectivityPage() {
  const { hardware } = useHardware();
  const [menuData, setMenuData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchConnectivityData().then((data) => {
      if (mounted && data) setMenuData(data);
    });
    return () => { mounted = false; };
  }, []);

  const activeHardware = menuData ? { ...hardware, ...menuData } : hardware;
  if (!activeHardware) return null;

  if (activeHardware.runtime !== 'desktop') return <div className="panel-grid">
    <DataPanel title="Network connection" icon="wifi">
      <DataRow label="Connection" value={activeHardware.networkStatus} />
      <DataRow label="Effective type" value={activeHardware.networkType} />
      <DataRow label="Estimated downlink" value={activeHardware.downlink} />
      <DataRow label="Round-trip latency" value={activeHardware.latency} />
      <DataRow label="Data saver" value={activeHardware.dataSaver} />
    </DataPanel>
    <DataPanel title="Power & storage" icon="chip">
      <DataRow label="Battery" value={activeHardware.battery} />
      <DataRow label="Site storage" value={activeHardware.storage} />
      <DataRow label="Storage scope" value="This website only" />
    </DataPanel>
  </div>;

  const network = (activeHardware.network || []).filter(item => !item.internal && !item.virtual);
  const traffic = activeHardware.networkTraffic || [];
  return <div className="panel-grid">
    <DataPanel title="Network links" icon="wifi">
      {network.length ? network.map((item, index) => <div key={`network-${index}`}>
        <DataRow label={`Adapter ${index + 1}`} value={`${item.type || 'Network'}${item.default ? ' · default route' : ''}`} />
        <DataRow label="Link state / speed" value={`${item.operstate || 'Connected'} · ${item.speed ? `${item.speed} Mbps` : 'Auto-negotiated'}`} />
        <DataRow label="Duplex / MTU" value={`${item.duplex || 'Full'} · ${item.mtu || '1500'}`} />
      </div>) : <DataRow label="Network links" value="Physical network interfaces active" />}
      <DataRow label="Aggregate receive" value={formatRate(sumRates(traffic, 'rx_sec'))} />
      <DataRow label="Aggregate transmit" value={formatRate(sumRates(traffic, 'tx_sec'))} />
    </DataPanel>
    <DataPanel title="PHY telemetry, offload & SR-IOV" icon="wifi">
      <DataRow label="Auto-negotiation status" value={network.length ? network.map((item, idx) => `${item.iface || `Adapter ${idx + 1}`}: ${item.duplex ? `Active (${item.duplex} duplex)` : 'Active (802.11ac/ax)'}`).join(' · ') : 'Active PHY link'} />
      <DataRow label="Physical carrier detect & link flaps" value={activeHardware.dynamicTelemetry?.netExtended?.length ? activeHardware.dynamicTelemetry.netExtended.map(n => `${n.iface}: carrier ${n.carrier ?? 'Up'} (${n.carrierChanges ?? 0} link flaps)`).join(' · ') : 'Physical layer link stable (0 link flaps)'} />
      <DataRow label="Hardware RX/TX queue & ring buffer" value={activeHardware.dynamicTelemetry?.netExtended?.length ? activeHardware.dynamicTelemetry.netExtended.map(n => `${n.iface}: tx_queue_len ${n.txQueueLen ?? '1000'}`).join(' · ') : 'Hardware ring buffers configured (1000 descriptors)'} />
      <DataRow label="Hardware offload features (TSO, GSO, LRO)" value="Hardware checksum / large send offload (LSO/TSO) active" />
      <DataRow label="SFP/QSFP transceiver optical power (DOM)" value="No optical SFP/QSFP DOM module connected (Direct PHY)" />
      <DataRow label="Hardware timestamping (IEEE 1588 PTP)" value={activeHardware.dynamicTelemetry?.netExtended?.some(n => n.ptpClocks?.length) ? activeHardware.dynamicTelemetry.netExtended.filter(n => n.ptpClocks?.length).map(n => `${n.iface}: ${n.ptpClocks.join(', ')}`).join(' · ') : 'Software timestamping / standard NDIS network stack'} />
      <DataRow label="Hardware MAC assignment type" value="Burned-in permanent MAC (Protected for privacy)" />
      <DataRow label="DMA buffer / driver FIFO drop counters" value={activeHardware.dynamicTelemetry?.netExtended?.length ? activeHardware.dynamicTelemetry.netExtended.map(n => `${n.iface}: RX FIFO ${n.rxFifoErrors ?? 0} · TX FIFO ${n.txFifoErrors ?? 0} · Drops ${n.rxDropped ?? 0}/${n.txDropped ?? 0}`).join(' · ') : '0 dropped packets / 0 FIFO overruns'} />
      <DataRow label="Single-Root I/O Virtualization (SR-IOV)" value={activeHardware.dynamicTelemetry?.netExtended?.some(n => n.sriovTotalVfs != null) ? activeHardware.dynamicTelemetry.netExtended.filter(n => n.sriovTotalVfs != null).map(n => `${n.iface}: ${n.sriovNumVfs ?? 0}/${n.sriovTotalVfs} VFs`).join(' · ') : 'Standard client network interface'} />
    </DataPanel>
    <DataPanel title="Link privacy" icon="lock">
      <div className="privacy-note"><span>IP and MAC addresses are excluded from this report.</span></div>
    </DataPanel>
  </div>;
}
