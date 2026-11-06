export const formatBytes = (value) => {
  if (!Number.isFinite(value) || value < 0) return 'Not reported';
  if (value === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** unitIndex).toFixed(unitIndex < 2 ? 0 : 1)} ${units[unitIndex]}`;
};

export const formatMemoryBytes = (value) => {
  if (!Number.isFinite(value) || value < 0) return 'Not reported';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = value === 0 ? 0 : Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** unitIndex).toFixed(2)} ${units[unitIndex]}`;
};

export const formatRate = (value) => Number.isFinite(value) && value >= 0 ? `${formatBytes(value)}/s` : 'Not reported';
export const formatFrequency = (value) => Number.isFinite(value) && value > 0 ? `${value.toFixed(2)} GHz` : 'Not reported';
export const formatPercent = (value) => Number.isFinite(value) ? `${Math.round(value)}%` : 'Not reported';

export const formatVoltage = (value) => {
  const voltage = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(voltage) && voltage > 0 ? `${voltage.toFixed(2)} V` : 'Not reported';
};

export const formatCapacity = (value) => Number.isFinite(value) ? formatBytes(value) : typeof value === 'string' && value.trim() ? value : 'Not reported';

export const unavailableReading = 'Not exposed by standard Linux hardware APIs';

export const formatOptional = (value, fallback = unavailableReading) => {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(' · ') : fallback;
  return String(value);
};

export const sumRates = (samples, key) => {
  const rates = samples.map(sample => sample[key]).filter(Number.isFinite);
  return rates.length ? rates.reduce((total, rate) => total + rate, 0) : null;
};