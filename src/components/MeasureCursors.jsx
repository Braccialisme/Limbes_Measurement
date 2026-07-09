import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Deux curseurs verticaux glissables + FREEZE-FRAME optionnel. Rapporte
 * l'écart en pixels ÉCRAN via onSpan(px). « Geler » capture la frame vidéo
 * courante sur un canvas (respect du cover) → on mesure sur l'image FIXE,
 * tremblement éliminé. Réutilisé par calibration, civil, mer.
 */
export default function MeasureCursors({ onSpan, videoRef }) {
  const [xa, setXa] = useState(() => window.innerWidth * 0.35);
  const [xb, setXb] = useState(() => window.innerWidth * 0.65);
  const [frozen, setFrozen] = useState(false);
  const canvasRef = useRef(null);
  const drag = useRef(null); // 'a' | 'b' | null

  const span = Math.abs(xb - xa);
  useEffect(() => { onSpan?.(span); }, [span, onSpan]);

  const clamp = (x) => Math.max(0, Math.min(window.innerWidth, x));

  const onMove = useCallback((e) => {
    if (!drag.current) return;
    const x = clamp(e.clientX ?? e.touches?.[0]?.clientX ?? 0);
    if (drag.current === 'a') setXa(x); else setXb(x);
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

  const freeze = () => {
    const v = videoRef?.current, c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return;
    const cw = window.innerWidth, ch = window.innerHeight;
    c.width = cw; c.height = ch;
    const scale = Math.max(cw / v.videoWidth, ch / v.videoHeight); // cover
    const dw = v.videoWidth * scale, dh = v.videoHeight * scale;
    c.getContext('2d').drawImage(v, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    setFrozen(true);
  };

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
      <canvas ref={canvasRef} className="freeze-canvas"
        style={{ display: frozen ? 'block' : 'none' }} />
      {handle('a', xa)}
      {handle('b', xb)}
      {videoRef && (
        <button className="btn freeze-btn"
          onClick={() => (frozen ? setFrozen(false) : freeze())}>
          {frozen ? 'reprendre' : 'geler'}
        </button>
      )}
    </div>
  );
}
