import { useState, useEffect, useCallback } from 'react';

/**
 * Capteurs d'orientation → { elevationDeg, rollDeg, headingDeg, headingSource }.
 *
 * Téléphone tenu en PORTRAIT, caméra arrière visant la cible :
 *   - beta ≈ 90° quand l'axe caméra est horizontal → élévation = beta − 90.
 *   - gamma ≈ roll (mise de niveau du limbe).
 *   - heading : webkitCompassHeading sur iOS (fiable-ish),
 *     sinon deviceorientationabsolute (Android), sinon alpha (repère arbitraire !).
 *
 * iOS exige un geste utilisateur → appeler requestAccess() depuis un tap.
 */
export function useOrientation() {
  const [state, setState] = useState({
    granted: false,
    needsPermission:
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function',
    elevationDeg: null,
    rollDeg: null,
    headingDeg: null,
    headingSource: 'none', // 'compass' | 'absolute' | 'relative' | 'none'
  });

  const requestAccess = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== 'granted') return false;
    }
    setState(s => ({ ...s, granted: true, needsPermission: false }));
    return true;
  }, []);

  useEffect(() => {
    if (!state.granted) return;

    const onOrient = (e) => {
      let heading = null;
      let source = 'none';
      if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
        heading = e.webkitCompassHeading; // iOS : azimut magnétique
        source = 'compass';
      } else if (e.absolute && e.alpha != null) {
        heading = (360 - e.alpha) % 360; // Android absolute
        source = 'absolute';
      } else if (e.alpha != null) {
        heading = (360 - e.alpha) % 360; // repère arbitraire, à recaler
        source = 'relative';
      }
      setState(s => ({
        ...s,
        elevationDeg: e.beta == null ? null : e.beta - 90,
        rollDeg: e.gamma == null ? null : e.gamma,
        headingDeg: heading,
        headingSource: source,
      }));
    };

    // Android : préférer l'event "absolute" quand il existe
    const hasAbsolute = 'ondeviceorientationabsolute' in window;
    const evt = hasAbsolute ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evt, onOrient, true);
    return () => window.removeEventListener(evt, onOrient, true);
  }, [state.granted]);

  return { ...state, requestAccess };
}
