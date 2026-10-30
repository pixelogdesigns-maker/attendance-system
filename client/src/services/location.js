// Reads the phone's current position. The server makes every decision; this only reports.
export function getReading() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser does not support location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp || Date.now(),
          source: 'web',
        }),
      (error) => {
        const messages = {
          1: 'Location permission is blocked. Allow location for this site in your browser settings.',
          2: 'Your location could not be found. Turn on GPS and try again.',
          3: 'Getting your location took too long. Try again.',
        };
        reject(new Error(messages[error.code] || error.message));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export async function permissionState() {
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state; // 'granted' | 'prompt' | 'denied'
  } catch {
    return 'unknown';
  }
}
