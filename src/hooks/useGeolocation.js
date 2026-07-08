import { useState, useEffect } from 'react';

/** GPS en continu → { fix, error }.
 *  fix = { lat, lon, altM, accuracyM } ou null tant qu'aucune position.
 *  error = message court si le signal manque (intérieur, ville dense…) ;
 *  la dernière position connue est conservée pendant l'erreur.
 *  L'altitude GPS est médiocre (±15-30 m) : en phase 2, le DEM à la
 *  position la remplacera. */
export function useGeolocation(enabled) {
  const [state, setState] = useState({ fix: null, error: null });
  useEffect(() => {
    if (!enabled) return;
    if (!('geolocation' in navigator)) {
      setState({ fix: null, error: 'GPS indisponible' });
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => setState({
        fix: {
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          altM: p.coords.altitude,
          accuracyM: p.coords.accuracy,
        },
        error: null,
      }),
      (err) => setState((s) => ({
        fix: s.fix, // garde la dernière position connue
        error:
          err.code === err.PERMISSION_DENIED ? 'position refusée'
          : err.code === err.POSITION_UNAVAILABLE ? 'signal faible (intérieur ?)'
          : 'délai dépassé',
      })),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);
  return state;
}
