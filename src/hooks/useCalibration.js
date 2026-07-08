import { useState, useCallback } from 'react';

/**
 * Échelle écran calibrée, persistée en localStorage, CLEFÉE PAR OBJECTIF
 * (lensKey = device + zoom). Changer d'objectif change le FOV → sa propre
 * calibration. cal = { degPerPx, refDeg, refPx, ts } ou null.
 */
const KEY = 'limbe.calibration.v2';

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

export function useCalibration(lensKey) {
  const [all, setAll] = useState(loadAll);
  const cal = lensKey ? (all[lensKey] || null) : null;

  const persist = (next) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
  };

  const save = useCallback((c) => {
    if (!lensKey) return;
    setAll((prev) => {
      const next = { ...prev, [lensKey]: { ...c, ts: Date.now() } };
      persist(next);
      return next;
    });
  }, [lensKey]);

  const clear = useCallback(() => {
    if (!lensKey) return;
    setAll((prev) => {
      const next = { ...prev };
      delete next[lensKey];
      persist(next);
      return next;
    });
  }, [lensKey]);

  return { cal, save, clear };
}
