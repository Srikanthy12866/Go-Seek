export async function fetchEnvironmentData() {
  if (window.deviceHardware?.getSnapshot) {
    try {
      const snapshot = await window.deviceHardware.getSnapshot();
      return {
        runtime: 'desktop',
        operatingSystem: snapshot.operatingSystem || 'Microsoft Windows',
        platform: snapshot.platform || 'win32',
        architecture: snapshot.architecture || 'x64',
        updatedAt: new Date(snapshot.capturedAt || Date.now()),
      };
    } catch (error) {
      console.warn('Failed to fetch snapshot environment:', error);
    }
  }

  const nav = window.navigator;
  return {
    runtime: 'browser',
    browser: nav.userAgent,
    browserVersion: nav.appVersion || 'Unknown',
    operatingSystem: nav.platform || 'Unknown',
    language: nav.language || 'en-US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    cookies: nav.cookieEnabled ? 'Enabled' : 'Disabled',
    battery: 'Restricted',
    storage: 'Restricted',
    languages: (nav.languages || []).join(', ') || 'en',
    userAgent: nav.userAgent,
    updatedAt: new Date(),
  };
}
