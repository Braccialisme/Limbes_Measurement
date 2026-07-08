import { useState, useCallback } from 'react';

/**
 * Échelle écran calibrée, persistée en localStorage.
 * cal = { degPerPx, refDeg, refPx, ts } ou null si jamais calibré.
 * Une calibration vaut pour l'objectif + le zoom courants ; quand le
 * sélecteur d'objectif arrivera, on clefera par lensId. Pour l'instant : une.
 */
const KEY = 'limbe.calibration.v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; }
  catch { return null; }
}

export function useCalibration() {
  const [cal, setCal] = useState(load);

  const save = useCallback((c) => {
    const next = { ...c, ts: Date.now() };
    setCal(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
  }, []);

  const clear = useCallback(() => {
    setCal(null);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  return { cal, save, clear };
}
