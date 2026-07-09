/**
 * Réticule superposé au liveview.
 * - Croix centrale : l'axe de visée.
 * - Ligne d'horizon artificiel : tourne avec le roll (mise de niveau).
 * - Limbe vertical à droite : échelle de tangage graduée qui défile avec
 *   l'élévation — la signature de l'instrument. Graduation : 1° majeur,
 *   0.5° mineur, sur une fenêtre de ±8°.
 */
export default function Reticle({ elevationDeg, rollDeg, markA, markB, cal }) {
  const W = 100, H = 100; // viewBox %, l'overlay est en position absolue plein écran
  const cx = W / 2, cy = H / 2;
  // Échelle du limbe : si l'objectif est calibré, on grade en DEGRÉS RÉELS.
  // deg/px écran → unités viewBox/degré : (1/degPerPx)·(100/hauteurÉcran).
  // Le SVG est preserveAspectRatio=none : 1 unité viewBox Y = H_écran/100 px.
  const pxPerDeg = cal
    ? (1 / cal.degPerPx) * (100 / window.innerHeight)
    : 6; // défaut visuel tant que non calibré

  const ticks = [];
  if (elevationDeg != null) {
    // Pas ADAPTATIF : on choisit le plus petit pas dont l'espacement à l'écran
    // reste lisible (≥ 6 unités viewBox entre traits étiquetés). Évite le
    // tassement quand l'échelle réelle serre le limbe.
    const CANDS = [0.25, 0.5, 1, 2, 5, 10, 15, 30, 45];
    const step = CANDS.find((s) => s * pxPerDeg >= 6) ?? 45;
    const half = 46 / pxPerDeg;                 // degrés du centre au bord du limbe
    const minorStep = step / 2;
    const start = Math.ceil((elevationDeg - half) / minorStep) * minorStep;
    for (let t = start; t <= elevationDeg + half; t += minorStep) {
      const y = cy + (elevationDeg - t) * pxPerDeg;
      if (y < 4 || y > H - 4) continue;
      const major = Math.abs(t / step - Math.round(t / step)) < 1e-6;
      ticks.push(
        <g key={t.toFixed(3)}>
          <line
            x1={major ? 88 : 91} y1={y} x2={94} y2={y}
            stroke="var(--brass)" strokeWidth={major ? 0.5 : 0.25}
          />
          {major && (
            <text x={87} y={y + 1.2} textAnchor="end" fontSize="2.6"
              fill="var(--brass)" fontFamily="var(--mono)">
              {Number.isInteger(step) ? Math.round(t) : t.toFixed(1)}°
            </text>
          )}
        </g>
      );
    }
  }

  const roll = rollDeg ?? 0;

  return (
    <>
      {/* Horizon artificiel — HORS du SVG étiré : un div tourné en CSS
          (rotation uniforme, sans déformation d'aspect). Contre-tourne avec
          le roll pour rester aligné sur l'horizontale vraie (niveau à bulle). */}
      <div className="art-horizon" style={{ transform: `rotate(${-roll}deg)` }}>
        <span className="ah-seg" />
        <span className="ah-seg" />
      </div>

      <svg className="reticle" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* croix de visée */}
      <line x1={cx} y1={cy - 5} x2={cx} y2={cy - 1.5} stroke="var(--signal)" strokeWidth="0.35" />
      <line x1={cx} y1={cy + 1.5} x2={cx} y2={cy + 5} stroke="var(--signal)" strokeWidth="0.35" />
      <circle cx={cx} cy={cy} r="0.6" fill="none" stroke="var(--signal)" strokeWidth="0.3" />

      {/* limbe vertical gradué */}
      <line x1={94} y1={4} x2={94} y2={96} stroke="var(--brass)" strokeWidth="0.35" />
      {ticks}
      {/* index fixe du limbe (la lecture se fait ici) */}
      <path d={`M 96 ${cy} l 3 -1.6 l 0 3.2 z`} fill="var(--signal)" />

      {/* repères des visées mémorisées */}
      {markA && (
        <text x={6} y={10} fontSize="3.2" fill="var(--brass)" fontFamily="var(--mono)">
          A ◆
        </text>
      )}
      {markB && (
        <text x={6} y={15} fontSize="3.2" fill="var(--brass)" fontFamily="var(--mono)">
          B ◆
        </text>
      )}
      </svg>
    </>
  );
}
