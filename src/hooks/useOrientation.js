import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Capteurs d'orientation → { elevationDeg, rollDeg, headingDeg, headingSource }.
 *
 * Téléphone tenu en PORTRAIT, caméra arrière visant la cible :
 *   - beta ≈ 90° quand l'axe caméra est horizontal → élévation = beta − 90.
 *   - gamma ≈ roll (mise de niveau du limbe).
 *   - heading : webkitCompassHeading sur iOS (fiable-ish),
 *     sinon deviceorientationabsolute (Android), sinon alpha (repère arbitraire !).
 *
 * LISSAGE : chaque valeur passe par une moyenne exponentielle (EMA) pour
 * tuer le tremblement capteur — c'est notre "stabilisateur". Le heading est
 * lissé en circulaire (sin/cos) pour franchir 0/360 sans à-coup. alpha bas
 * = plus stable mais plus de latence ; on vise steady-avant-tap.
 */
const A_TILT = 0.1;   // élévation & roll (bas = très stable)
const A_HEAD = 0.1;   // azimut (circulaire)

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

  // Accumulateurs EMA (persistants entre événements).
  const s = useRef({ elev: null, roll: null, sin: null, cos: null });

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

    const ema = (prev, x, a) => (prev == null ? x : prev + a * (x - prev));

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

      const acc = s.current;

      // Élévation & roll : EMA linéaire.
      const elevRaw = e.beta == null ? null : e.beta - 90;
      const rollRaw = e.gamma == null ? null : e.gamma;
      if (elevRaw != null) acc.elev = ema(acc.elev, elevRaw, A_TILT);
      if (rollRaw != null) acc.roll = ema(acc.roll, rollRaw, A_TILT);

      // Heading : EMA circulaire via sin/cos.
      let headingOut = null;
      if (heading != null) {
        const r = heading * Math.PI / 180;
        acc.sin = ema(acc.sin, Math.sin(r), A_HEAD);
        acc.cos = ema(acc.cos, Math.cos(r), A_HEAD);
        headingOut = (Math.atan2(acc.sin, acc.cos) * 180 / Math.PI + 360) % 360;
      }

      setState(s => ({
        ...s,
        elevationDeg: acc.elev,
        rollDeg: acc.roll,
        headingDeg: headingOut,
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
