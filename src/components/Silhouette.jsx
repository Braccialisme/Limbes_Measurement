import { useRef, useState } from 'react';

/**
 * Recalage d'azimut par silhouette de crête. On superpose le profil 360° du
 * relief (calculé depuis le DEM) au liveview ; l'utilisateur glisse
 * horizontalement pour le faire coïncider avec la vraie crête à l'écran →
 * offset d'azimut calé sur le terrain. Résout le maillon faible (boussole)
 * et le cas headingSource 'relative'.
 *
 * FOV : utilise l'échelle calibrée deg/px si dispo, sinon un défaut ~66°.
 * L'alignement n'a pas besoin d'un FOV parfait, juste approché.
 */
const DEFAULT_FOV = 66;

export default function Silhouette({ profile, headingRaw, offset, elevationDeg, cal, onCommit, onCancel }) {
  const W = window.innerWidth, H = window.innerHeight;
  const degPerPx = cal ? cal.degPerPx : DEFAULT_FOV / W;
  const pxPerDeg = 1 / degPerPx;
  const cx = W / 2, cy = H / 2;
  const elev0 = elevationDeg ?? 0;

  const [drag, setDrag] = useState(0); // degrés ajoutés en glissant
  const start = useRef(null);

  const displayHeading = (headingRaw ?? 0) + offset + drag;
  const angDiff = (a, b) => (((a - b + 540) % 360) - 180);

  // Points visibles du profil projetés en (x,y) écran.
  const pts = [];
  for (const p of profile) {
    const dx = angDiff(p.azDeg, displayHeading);
    if (Math.abs(dx) > (W / 2) * degPerPx + 10) continue;
    const x = cx + dx * pxPerDeg;
    const y = cy - (p.elevDeg - elev0) * pxPerDeg;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const onDown = (e) => { start.current = e.clientX; };
  const onMove = (e) => {
    if (start.current == null) return;
    const dxPx = e.clientX - start.current;
    start.current = e.clientX;
    setDrag((d) => d - dxPx * degPerPx); // glisser à droite → crête à droite
  };
  const onUp = () => { start.current = null; };

  return (
    <div
      className="silhouette"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      <svg width={W} height={H} className="silhouette-svg">
        {/* ligne d'axe = centre de visée */}
        <line x1={cx} y1={0} x2={cx} y2={H} stroke="var(--signal)" strokeWidth="1" opacity="0.5" />
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke="var(--brass)"
          strokeWidth="2"
          opacity="0.85"
        />
      </svg>
      <div className="panel">
        <div className="panel-title">Recalage azimut — silhouette</div>
        <p className="hint">
          Glisse le profil (bleu) pour l'aligner sur la vraie crête dans la
          caméra. Offset actuel {(offset + drag).toFixed(1)}°.
        </p>
        <div className="row measure">
          <button className="btn ghost" onClick={onCancel}>Annuler</button>
          <button className="btn primary" onClick={() => onCommit(offset + drag)}>Caler</button>
        </div>
      </div>
    </div>
  );
}
