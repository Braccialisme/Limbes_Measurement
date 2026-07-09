import { skyPositions, dayNumber, sunEquatorial, equatorialToHorizontal } from '../lib/astro.js';
import { STARS } from '../lib/stars.js';

/**
 * Superpose au liveview la position ATTENDUE du Soleil et de la Lune : un
 * anneau à leur azimut/hauteur calculés, dimensionné au diamètre apparent.
 * Aligne-le sur l'astre réel pour vérifier ton cap, ou compare les tailles.
 * Utilise l'échelle deg/px calibrée (défaut ~66°). Finder visuel.
 */
const DEFAULT_FOV = 66;
const angDiff = (a, b) => (((a - b + 540) % 360) - 180);

function Body({ body, glyph, headingDeg, elevationDeg, degPerPx, W, H }) {
  if (body.altDeg < -2 || headingDeg == null || elevationDeg == null) return null;
  const pxPerDeg = 1 / degPerPx;
  const cx = W / 2, cy = H / 2;
  const dx = angDiff(body.azDeg, headingDeg);
  const x = cx + dx * pxPerDeg;
  const y = cy - (body.altDeg - elevationDeg) * pxPerDeg;
  if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return null;
  const rTrue = Math.max(1, (body.diamDeg / 2) * pxPerDeg); // taille apparente
  const rFind = Math.max(rTrue, 14);                        // anneau repérable
  return (
    <g>
      <circle cx={x} cy={y} r={rFind} fill="none" stroke="var(--signal)" strokeWidth="1" opacity="0.5" />
      <circle cx={x} cy={y} r={rTrue} fill="none" stroke="var(--brass)" strokeWidth="1.5" />
      <text x={x + rFind + 4} y={y + 4} fill="var(--brass)" fontFamily="var(--mono)" fontSize="14">{glyph}</text>
    </g>
  );
}

function Star({ star, headingDeg, elevationDeg, degPerPx, W, H }) {
  if (star.altDeg < 0 || headingDeg == null || elevationDeg == null) return null;
  const pxPerDeg = 1 / degPerPx;
  const dx = angDiff(star.azDeg, headingDeg);
  const x = W / 2 + dx * pxPerDeg;
  const y = H / 2 - (star.altDeg - elevationDeg) * pxPerDeg;
  if (x < 0 || x > W || y < 0 || y > H) return null;
  return (
    <g>
      <circle cx={x} cy={y} r="1.6" fill="var(--ivory)" />
      <text x={x + 5} y={y + 3} fill="var(--ivory)" fontFamily="var(--mono)" fontSize="10" opacity="0.85">{star.name}</text>
    </g>
  );
}

export default function SkyOverlay({ fix, headingDeg, elevationDeg, cal }) {
  if (!fix) return null;
  const W = window.innerWidth, H = window.innerHeight;
  const degPerPx = cal ? cal.degPerPx : DEFAULT_FOV / W;
  const now = new Date();
  const sky = skyPositions(now, fix.lat, fix.lon);

  // Étoiles brillantes → alt/az à l'instant/lieu (n'apparaissent que de nuit).
  const d = dayNumber(now);
  const sun = sunEquatorial(d);
  const stars = sky.sun.altDeg < -2
    ? STARS.map((s) => ({ ...s, ...equatorialToHorizontal(s.ra, s.dec, fix.lat, fix.lon, d, sun) }))
    : [];

  return (
    <svg className="sky-overlay" width={W} height={H}>
      {stars.map((s) => (
        <Star key={s.name} star={s} headingDeg={headingDeg} elevationDeg={elevationDeg} degPerPx={degPerPx} W={W} H={H} />
      ))}
      <Body body={sky.sun} glyph="☉" headingDeg={headingDeg} elevationDeg={elevationDeg} degPerPx={degPerPx} W={W} H={H} />
      <Body body={sky.moon} glyph="☾" headingDeg={headingDeg} elevationDeg={elevationDeg} degPerPx={degPerPx} W={W} H={H} />
    </svg>
  );
}
