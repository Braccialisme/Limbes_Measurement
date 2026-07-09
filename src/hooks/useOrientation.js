import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Capteurs d'orientation → { elevationDeg, rollDeg, headingDeg, headingSource }.
 *
 * Téléphone tenu en PORTRAIT, caméra arrière visant la cible :
 *   - beta ≈ 90° quand l'axe caméra est horizontal → élévation = beta − 90.
 *   - heading : webkitCompassHeading (iOS), deviceorientationabsolute
 *     (Android), sinon alpha (repère arbitraire).
 *
 * ROLL : PAS depuis gamma ! Dans la pose de visée beta≈90° = dégénérescence
 * des angles d'Euler (gimbal lock) → gamma saute partout. On calcule le roll
 * depuis le VECTEUR GRAVITÉ (devicemotion / accéléromètre), stable à toute
 * inclinaison : roll = atan2(ax, −ay) sur le plan de l'écran.
 *
 * LISSAGE : moyenne exponentielle (EMA) sur tout — c'est le stabilisateur.
 */
const A_TILT = 0.1;   // élévation & roll
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

  // Accumulateurs EMA persistants entre événements.
  const s = useRef({ elev: null, roll: null, sin: null, cos: null });

  const requestAccess = useCallback(async () => {
    const D = typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : null;
    const M = typeof DeviceMotionEvent !== 'undefined' ? DeviceMotionEvent : null;
    try {
      if (D && typeof D.requestPermission === 'function') {
        if (await D.requestPermission() !== 'granted') return false;
      }
      if (M && typeof M.requestPermission === 'function') {
        await M.requestPermission(); // gravité pour le roll ; non bloquant si refusé
      }
    } catch { /* certains navigateurs jettent hors geste utilisateur */ }
    setState(st => ({ ...st, granted: true, needsPermission: false }));
    return true;
  }, []);

  useEffect(() => {
    if (!state.granted) return;
    const ema = (prev, x, a) => (prev == null ? x : prev + a * (x - prev));

    // Roll depuis la gravité (stable même à beta≈90°).
    const onMotion = (e) => {
      const g = e.accelerationIncludingGravity;
      if (!g || g.x == null || g.y == null) return;
      const rollRaw = Math.atan2(g.x, -g.y) * 180 / Math.PI;
      s.current.roll = ema(s.current.roll, rollRaw, A_TILT);
      setState(st => ({ ...st, rollDeg: s.current.roll }));
    };

    const onOrient = (e) => {
      let heading = null, source = 'none';
      if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
        heading = e.webkitCompassHeading; source = 'compass';
      } else if (e.absolute && e.alpha != null) {
        heading = (360 - e.alpha) % 360; source = 'absolute';
      } else if (e.alpha != null) {
        heading = (360 - e.alpha) % 360; source = 'relative';
      }

      const acc = s.current;
      const elevRaw = e.beta == null ? null : e.beta - 90;
      if (elevRaw != null) acc.elev = ema(acc.elev, elevRaw, A_TILT);

      // Fallback roll depuis gamma UNIQUEMENT si pas de devicemotion (roll null).
      if (acc.roll == null && e.gamma != null) acc.roll = ema(acc.roll, e.gamma, A_TILT);

      let headingOut = null;
      if (heading != null) {
        const r = heading * Math.PI / 180;
        acc.sin = ema(acc.sin, Math.sin(r), A_HEAD);
        acc.cos = ema(acc.cos, Math.cos(r), A_HEAD);
        headingOut = (Math.atan2(acc.sin, acc.cos) * 180 / Math.PI + 360) % 360;
      }

      setState(st => ({
        ...st,
        elevationDeg: acc.elev,
        rollDeg: acc.roll,
        headingDeg: headingOut,
        headingSource: source,
      }));
    };

    const hasAbsolute = 'ondeviceorientationabsolute' in window;
    const oevt = hasAbsolute ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(oevt, onOrient, true);
    window.addEventListener('devicemotion', onMotion, true);
    return () => {
      window.removeEventListener(oevt, onOrient, true);
      window.removeEventListener('devicemotion', onMotion, true);
    };
  }, [state.granted]);

  return { ...state, requestAccess };
}
