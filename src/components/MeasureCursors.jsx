import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Deux curseurs verticaux glissables sur le liveview. Rapporte l'écart
 * en pixels ÉCRAN via onSpan(px) — pas besoin de bouger le téléphone.
 * Réutilisé par la calibration (encadrer un objet connu) et le mode civil
 * (mesurer une largeur angulaire). L'écart en pixels écran est ce qui
 * compte : l'échelle deg/px calibrée le convertit en angle réel.
 */
export default function MeasureCursors({ onSpan }) {
  const [xa, setXa] = useState(() => window.innerWidth * 0.35);
  const [xb, setXb] = useState(() => window.innerWidth * 0.65);
  const drag = useRef(null); // 'a' | 'b' | null

  const span = Math.abs(xb - xa);
  useEffect(() => { onSpan?.(span); }, [span, onSpan]);

  const clamp = (x) => Math.max(0, Math.min(window.innerWidth, x));

  const onMove = useCallback((e) => {
    if (!drag.current) return;
    const x = clamp(e.clientX ?? e.touches?.[0]?.clientX ?? 0);
    if (drag.current === 'a') setXa(x);
    else setXb(x);
  }, []);
  const onUp = useCallback(() => { drag.current = null; }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onMove, onUp]);

  const handle = (which, x) => (
    <div
      className="cursor-line"
      style={{ left: x }}
      onPointerDown={(e) => { e.preventDefault(); drag.current = which; }}
    >
      <span className="cursor-grip" />
      <span className="cursor-tag">{which.toUpperCase()}</span>
    </div>
  );

  return (
    <div className="cursors">
      {handle('a', xa)}
      {handle('b', xb)}
    </div>
  );
}
