import { useState, useEffect } from 'react';

/** GPS en continu → { lat, lon, altM, accuracyM }. L'altitude GPS est
 *  médiocre (±15-30 m) : en phase 2, le DEM à la position la remplacera. */
export function useGeolocation(enabled) {
  const [fix, setFix] = useState(null);
  useEffect(() => {
    if (!enabled || !('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setFix({
        lat: p.coords.latitude,
        lon: p.coords.longitude,
        altM: p.coords.altitude,
        accuracyM: p.coords.accuracy,
      }),
      () => setFix(null),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);
  return fix;
}
