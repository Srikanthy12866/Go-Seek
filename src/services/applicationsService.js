export async function fetchApplicationsData() {
  if (window.deviceHardware?.getApplications) {
    try {
      const data = await window.deviceHardware.getApplications();
      return { ...data, runtime: 'desktop', updatedAt: new Date() };
    } catch (error) {
      console.warn('Failed to fetch segregated applications data:', error);
    }
  }

  if (window.deviceHardware?.getSnapshot) {
    try {
      const snapshot = await window.deviceHardware.getSnapshot();
      return {
        runtime: 'desktop',
        applicationsSupported: snapshot.applicationsSupported ?? true,
        applications: snapshot.applications || [],
        updatedAt: new Date(snapshot.capturedAt || Date.now()),
      };
    } catch (error) {
      console.warn('Failed to fetch snapshot applications:', error);
    }
  }

  return {
    runtime: 'browser',
    applicationsSupported: false,
    applications: [],
    updatedAt: new Date(),
  };
}
