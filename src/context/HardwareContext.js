import { createContext, useContext, useEffect, useState } from 'react';
import { readHardware } from '../lib/readHardware';

const HardwareContext = createContext(null);

export function HardwareProvider({ children }) {
  const [hardware, setHardware] = useState(null);
  const [frequencyHistory, setFrequencyHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setHardware(await readHardware());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let reading = false;
    const poll = async () => {
      if (reading) return;
      reading = true;
      try {
        const nextHardware = await readHardware();
        if (mounted) setHardware(nextHardware);
      } finally {
        reading = false;
        if (mounted) setLoading(false);
      }
    };
    poll();
    const updateNetwork = () => setHardware(current => current ? { ...current, networkStatus: navigator.onLine ? 'Online' : 'Offline' } : current);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    const timer = window.deviceHardware ? window.setInterval(poll, 1000) : null;
    return () => {
      mounted = false;
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      if (timer) window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (hardware?.runtime !== 'desktop') return;
    const sample = {
      capturedAt: hardware.capturedAt,
      frequency: hardware.cpu.averageSpeedGhz,
    };
    if (!Number.isFinite(sample.frequency) || sample.frequency <= 0) return;

    setFrequencyHistory(current => {
      if (current[current.length - 1]?.capturedAt === sample.capturedAt) return current;
      return [...current, sample].slice(-61);
    });
  }, [hardware]);

  return <HardwareContext.Provider value={{ hardware, frequencyHistory, loading, refresh }}>{children}</HardwareContext.Provider>;
}

export function useHardware() {
  const context = useContext(HardwareContext);
  if (!context) throw new Error('useHardware must be used inside HardwareProvider');
  return context;
}