/**
 * astro.js — éphémérides basiques Soleil & Lune (le volet « almanach »).
 * Fonctions pures. Méthode Paul Schlyter (précision ~1-2′ Soleil, ~2-4′ Lune,
 * suffisant pour pointer et comparer au diamètre apparent mesuré).
 * Angles en degrés ; RA/Dec équatoriaux ; alt/az horizontaux (az 0=N, horaire).
 */
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const rev = (x) => x - Math.floor(x / 360) * 360;       // → [0,360)
const sin = (d) => Math.sin(d * D2R);
const cos = (d) => Math.cos(d * D2R);
const atan2d = (y, x) => Math.atan2(y, x) * R2D;
const asind = (x) => Math.asin(x) * R2D;

/** Jour Schlyter d (depuis 2000 Jan 0.0 UT), fraction de jour incluse. */
export function dayNumber(date) {
  const Y = date.getUTCFullYear(), M = date.getUTCMonth() + 1, D = date.getUTCDate();
  const ut = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const d = 367 * Y
    - Math.floor(7 * (Y + Math.floor((M + 9) / 12)) / 4)
    + Math.floor(275 * M / 9) + D - 730530;
  return d + ut / 24;
}

/** Obliquité de l'écliptique (deg). */
function obliquity(d) { return 23.4393 - 3.563e-7 * d; }

/** Position équatoriale du Soleil + éléments réutilisés par la Lune. */
export function sunEquatorial(d) {
  const w = 282.9404 + 4.70935e-5 * d;   // longitude du périhélie
  const e = 0.016709 - 1.151e-9 * d;     // excentricité
  const M = rev(356.0470 + 0.9856002585 * d); // anomalie moyenne
  const oblecl = obliquity(d);

  const E = M + R2D * e * sin(M) * (1 + e * cos(M));
  const xv = cos(E) - e;
  const yv = Math.sqrt(1 - e * e) * sin(E);
  const v = atan2d(yv, xv);              // anomalie vraie
  const r = Math.sqrt(xv * xv + yv * yv); // distance (UA)
  const lon = rev(v + w);               // longitude écliptique

  const xs = r * cos(lon), ys = r * sin(lon);
  const xe = xs;
  const ye = ys * cos(oblecl);
  const ze = ys * sin(oblecl);
  const ra = rev(atan2d(ye, xe));
  const dec = asind(ze / r);

  return { ra, dec, r, lon, M, w, oblecl, diamDeg: 1919.26 / 3600 / r };
}

/** Position équatoriale de la Lune (avec perturbations principales). */
export function moonEquatorial(d, sun) {
  const N = rev(125.1228 - 0.0529538083 * d);
  const i = 5.1454;
  const w = rev(318.0634 + 0.1643573223 * d);
  const a = 60.2666;                    // rayons terrestres
  const e = 0.054900;
  const M = rev(115.3654 + 13.0649929509 * d);
  const oblecl = sun.oblecl;

  let E = M + R2D * e * sin(M) * (1 + e * cos(M));
  E = E - (E - R2D * e * sin(E) - M) / (1 - e * cos(E)); // 1 itération Newton

  const xv = a * (cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * sin(E);
  const v = atan2d(yv, xv);
  let r = Math.sqrt(xv * xv + yv * yv);

  // Rectangulaire écliptique géocentrique.
  let xg = r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i));
  let yg = r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i));
  let zg = r * (sin(v + w) * sin(i));
  let lon = rev(atan2d(yg, xg));
  let lat = atan2d(zg, Math.sqrt(xg * xg + yg * yg));

  // Perturbations (Schlyter).
  const Ms = sun.M, ws = sun.w;
  const Ls = rev(Ms + ws);              // longitude moyenne Soleil
  const Lm = rev(M + w + N);            // longitude moyenne Lune
  const Dm = rev(Lm - Ls);             // élongation moyenne
  const F = rev(Lm - N);              // argument de latitude

  lon += -1.274 * sin(M - 2 * Dm)
    + 0.658 * sin(2 * Dm)
    - 0.186 * sin(Ms)
    - 0.059 * sin(2 * M - 2 * Dm)
    - 0.057 * sin(M - 2 * Dm + Ms)
    + 0.053 * sin(M + 2 * Dm)
    + 0.046 * sin(2 * Dm - Ms)
    + 0.041 * sin(M - Ms)
    - 0.035 * sin(Dm)
    - 0.031 * sin(M + Ms)
    - 0.015 * sin(2 * F - 2 * Dm)
    + 0.011 * sin(M - 4 * Dm);
  lat += -0.173 * sin(F - 2 * Dm)
    - 0.055 * sin(M - F - 2 * Dm)
    - 0.046 * sin(M + F - 2 * Dm)
    + 0.033 * sin(F + 2 * Dm)
    + 0.017 * sin(2 * M + F);
  r += -0.58 * cos(M - 2 * Dm) - 0.46 * cos(2 * Dm);

  // Recompose en équatorial.
  const xh = r * cos(lon) * cos(lat);
  const yh = r * sin(lon) * cos(lat);
  const zh = r * sin(lat);
  const xe = xh;
  const ye = yh * cos(oblecl) - zh * sin(oblecl);
  const ze = yh * sin(oblecl) + zh * cos(oblecl);
  const ra = rev(atan2d(ye, xe));
  const dec = atan2d(ze, Math.sqrt(xe * xe + ye * ye));

  const distanceKm = r * 6371.0;
  // Diamètre apparent physique (rayon lunaire 1737.4 km) — exact.
  const diamDeg = 2 * Math.atan(1737.4 / distanceKm) * R2D;
  return { ra, dec, r, distanceKm, diamDeg };
}

/** Équatorial → horizontal (alt/az) à (lat, lon) et l'instant d. */
export function equatorialToHorizontal(ra, dec, latDeg, lonDeg, d, sun) {
  const ut = (d - Math.floor(d)) * 24;
  const Ls = rev(sun.M + sun.w);
  const gmst0 = rev(Ls + 180) / 15;           // heures
  const lst = rev((gmst0 + ut) * 15 + lonDeg); // temps sidéral local (deg)
  const ha = rev(lst - ra);                    // angle horaire (deg)

  const x = cos(ha) * cos(dec);
  const y = sin(ha) * cos(dec);
  const z = sin(dec);
  const xhor = x * sin(latDeg) - z * cos(latDeg);
  const yhor = y;
  const zhor = x * cos(latDeg) + z * sin(latDeg);
  const az = rev(atan2d(yhor, xhor) + 180);
  const alt = asind(zhor);
  return { altDeg: alt, azDeg: az };
}

/** Tout-en-un : positions apparentes du Soleil et de la Lune. */
export function skyPositions(date, latDeg, lonDeg) {
  const d = dayNumber(date);
  const sun = sunEquatorial(d);
  const moon = moonEquatorial(d, sun);
  const sh = equatorialToHorizontal(sun.ra, sun.dec, latDeg, lonDeg, d, sun);
  const mh = equatorialToHorizontal(moon.ra, moon.dec, latDeg, lonDeg, d, sun);
  return {
    sun: { ...sh, diamDeg: sun.diamDeg, distanceAU: sun.r, decDeg: sun.dec },
    moon: { ...mh, diamDeg: moon.diamDeg, distanceKm: moon.distanceKm, decDeg: moon.dec },
  };
}
