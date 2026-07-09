/**
 * geometry.js — le cœur de Limbe. Fonctions pures, zéro dépendance, zéro DOM.
 * Toutes les distances en mètres sauf mention _km, tous les angles en degrés
 * sauf mention Rad. Conventions : élévation positive vers le haut,
 * azimut 0° = Nord, sens horaire.
 */

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/** Rayon terrestre moyen (m). */
export const EARTH_R = 6_371_000;

/**
 * Coefficient de réfraction atmosphérique standard k ≈ 0.13 :
 * la lumière courbe légèrement vers le bas, la Terre paraît plus plate.
 * Rayon effectif R' = R / (1 - k).
 */
export const REFRACTION_K = 0.13;
export const EARTH_R_EFF = EARTH_R / (1 - REFRACTION_K);

/* ------------------------------------------------------------------ */
/* Horizon et courbure — le cas "lumières depuis la plage"             */
/* ------------------------------------------------------------------ */

/**
 * Distance de l'horizon visible (km) pour une hauteur d'œil (m).
 * d = √(2 R' h). Avec réfraction standard : ≈ 3.86 √h.
 * Œil à 1.6 m → ~4.9 km. Dune à 10 m → ~12.2 km.
 */
export function horizonDistanceKm(eyeHeightM) {
  if (eyeHeightM <= 0) return 0;
  return Math.sqrt(2 * EARTH_R_EFF * eyeHeightM) / 1000;
}

/**
 * Abaissement (dip) de l'horizon sous l'horizontale vraie, en degrés.
 * dip ≈ √(2h/R') rad. C'est la correction du sextant marin.
 */
export function horizonDipDeg(eyeHeightM) {
  if (eyeHeightM <= 0) return 0;
  return Math.sqrt((2 * eyeHeightM) / EARTH_R_EFF) * RAD;
}

/**
 * Inverse du dip : hauteur d'œil (m) déduite de l'abaissement mesuré de
 * l'horizon marin. h = R'·dip²/2 (dip en rad). C'est le sextant qui se
 * mesure lui-même : viser l'horizontale vraie (gravité) puis l'horizon,
 * l'écart de pitch donne le dip, on remonte à la hauteur.
 *
 * ATTENTION — n'est exploitable qu'en HAUTEUR : à 1.6 m le dip vaut ~0.04°,
 * noyé sous le bruit du pitch. À 50 m il vaut ~0.22°, à 100 m ~0.31° :
 * mesurable. Réservé au cas falaise/colline, pas à la plage.
 */
export function eyeHeightFromDipDeg(dipDeg) {
  if (dipDeg <= 0) return 0;
  const dipRad = dipDeg * DEG;
  return (EARTH_R_EFF * dipRad * dipRad) / 2;
}

/**
 * Hauteur (m) cachée par la courbure pour un objet situé
 * `distanceKm` au-delà de TON horizon. ≈ 0.0675 · d² (réfraction incluse).
 * À 10 km derrière l'horizon : ~6.7 m de coque avalés.
 */
export function hiddenHeightM(distanceBeyondHorizonKm) {
  if (distanceBeyondHorizonKm <= 0) return 0;
  const d = distanceBeyondHorizonKm * 1000;
  return (d * d) / (2 * EARTH_R_EFF);
}

/**
 * Distance (m) d'un objet dont la LIGNE DE FLOTTAISON est visible, depuis
 * l'angle de dépression mesuré sous l'horizontale vraie (pitch) et la hauteur
 * d'œil. La dépression d'un point à la surface à distance d vaut
 *   β ≈ h/d + d/(2R')  (chute géométrique + courbure).
 * On inverse : d²/(2R') − β·d + h = 0 → racine proche
 *   d = R'·(β − √(β² − 2h/R')).
 * Si β < dip de l'horizon (discriminant < 0), la flottaison est au-delà de
 * l'horizon → non mesurable ici (retourne null). C'est LA distance marine,
 * fondée sur le pitch (précis), sans FOV.
 */
export function distanceFromWaterlineDipM(depressionDeg, eyeHeightM) {
  if (depressionDeg <= 0 || eyeHeightM <= 0) return null;
  const beta = depressionDeg * DEG;
  const disc = beta * beta - (2 * eyeHeightM) / EARTH_R_EFF;
  if (disc < 0) return null; // au-delà de l'horizon
  return EARTH_R_EFF * (beta - Math.sqrt(disc));
}

/**
 * Le diagnostic binaire de la plage.
 * Si la ligne de flottaison est visible → l'objet est en deçà de l'horizon :
 * distance max = horizon, et la taille se calcule directement.
 * Si la coque est tranchée par l'horizon → l'objet est au-delà :
 * on ne peut donner qu'un PLANCHER de taille = largeur angulaire × d_horizon.
 */
export function seaObjectEstimate({ eyeHeightM, angularWidthDeg, waterlineVisible }) {
  const dHorizonKm = horizonDistanceKm(eyeHeightM);
  if (waterlineVisible) {
    return {
      kind: 'within-horizon',
      maxDistanceKm: dHorizonKm,
      maxSizeM: angularSizeToPhysicalM(angularWidthDeg, dHorizonKm * 1000),
    };
  }
  return {
    kind: 'beyond-horizon',
    minDistanceKm: dHorizonKm,
    minSizeM: angularSizeToPhysicalM(angularWidthDeg, dHorizonKm * 1000),
  };
}

/* ------------------------------------------------------------------ */
/* Angles ↔ tailles ↔ distances                                        */
/* ------------------------------------------------------------------ */

/** Taille physique (m) d'un objet de largeur angulaire donnée à distance connue. */
export function angularSizeToPhysicalM(angleDeg, distanceM) {
  return 2 * distanceM * Math.tan((angleDeg * DEG) / 2);
}

/** Largeur angulaire (deg) d'un objet de taille connue à distance connue.
 *  L'inverse exact de angularSizeToPhysicalM. Sert à la calibration écran. */
export function angularWidthDeg(sizeM, distanceM) {
  if (distanceM <= 0) return 0;
  return 2 * Math.atan(sizeM / (2 * distanceM)) * RAD;
}

/**
 * Échelle écran issue d'une calibration : degrés par pixel écran.
 * On encadre un objet de largeur angulaire connue entre deux curseurs
 * séparés de `pixelSpan` px → deg/px. Auto-corrige le recadrage
 * object-fit:cover : c'est l'angle réel par pixel AFFICHÉ, tout objectif
 * et tout zoom confondus, il suffit de recalibrer par objectif.
 */
export function degPerScreenPx(angleDeg, pixelSpan) {
  if (pixelSpan <= 0) return 0;
  return angleDeg / pixelSpan;
}

/** Largeur angulaire (deg) d'un écart de `pixelSpan` px écran, une fois
 *  l'échelle `degPerPx` calibrée. Mesure d'angle sans bouger le téléphone. */
export function spanToAngleDeg(pixelSpan, degPerPx) {
  return Math.abs(pixelSpan) * degPerPx;
}

/** Distance (m) d'un objet de taille connue vu sous un angle donné. */
export function physicalSizeToDistanceM(sizeM, angleDeg) {
  const a = angleDeg * DEG;
  if (a <= 0) return Infinity;
  return sizeM / (2 * Math.tan(a / 2));
}

/**
 * Hauteur d'un objet (le "pitit château") vu à distance horizontale D (m)
 * entre deux angles d'élévation (base, sommet), courbure/réfraction corrigées.
 * h = D·(tan θtop − tan θbase). La correction de courbure s'annule dans la
 * différence si base et sommet sont à la même distance — elle ne compte que
 * pour l'ALTITUDE absolue, pas pour la hauteur relative.
 */
export function heightFromElevationsM(distanceM, elevBaseDeg, elevTopDeg) {
  return distanceM * (Math.tan(elevTopDeg * DEG) - Math.tan(elevBaseDeg * DEG));
}

/**
 * Altitude du point visé au-dessus de l'observateur (m), courbure comprise :
 * Δalt = D·tanθ + D²/(2R'). Sert au ray-march DEM de la phase 2.
 */
export function targetAltitudeDeltaM(distanceM, elevDeg) {
  return distanceM * Math.tan(elevDeg * DEG) + (distanceM * distanceM) / (2 * EARTH_R_EFF);
}

/* ------------------------------------------------------------------ */
/* Séparation angulaire entre deux visées (le sextant à deux taps)     */
/* ------------------------------------------------------------------ */

/**
 * Angle (deg) entre deux directions (azimut, élévation) — loi des cosinus
 * sphérique. C'est LA mesure du sextant : viser A, tap, viser B, tap.
 */
export function angularSeparationDeg(a, b) {
  const e1 = a.elevationDeg * DEG, e2 = b.elevationDeg * DEG;
  const dAz = (b.azimuthDeg - a.azimuthDeg) * DEG;
  const cosSep =
    Math.sin(e1) * Math.sin(e2) + Math.cos(e1) * Math.cos(e2) * Math.cos(dAz);
  return Math.acos(Math.min(1, Math.max(-1, cosSep))) * RAD;
}

/* ------------------------------------------------------------------ */
/* Formats d'affichage — degrés / arcmin / arcsec                      */
/* ------------------------------------------------------------------ */

/** 1.5375° → "1° 32′ 15″" */
export function formatDMS(deg) {
  const sign = deg < 0 ? '−' : '';
  let x = Math.abs(deg);
  const d = Math.floor(x);
  x = (x - d) * 60;
  const m = Math.floor(x);
  const s = Math.round((x - m) * 60);
  return `${sign}${d}° ${String(m).padStart(2, '0')}′ ${String(s).padStart(2, '0')}″`;
}

/* ------------------------------------------------------------------ */
/* Géodésie minimale — pour le ray-march DEM (phase 2)                 */
/* ------------------------------------------------------------------ */

/**
 * Point d'arrivée depuis (lat, lon) en suivant un azimut sur une distance (m).
 * Formule du grand cercle sur sphère — largement suffisant à ces portées.
 */
export function destinationPoint(latDeg, lonDeg, bearingDeg, distanceM) {
  const δ = distanceM / EARTH_R;
  const θ = bearingDeg * DEG;
  const φ1 = latDeg * DEG, λ1 = lonDeg * DEG;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );
  return { latDeg: φ2 * RAD, lonDeg: ((λ2 * RAD + 540) % 360) - 180 };
}

/**
 * Relèvement initial (deg, 0=N horaire) du grand cercle de (lat1,lon1) vers
 * (lat2,lon2). C'est l'azimut du pélorus : vers où pointer pour viser un point.
 */
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * DEG, φ2 = lat2 * DEG, Δλ = (lon2 - lon1) * DEG;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * RAD + 360) % 360;
}

/** Distance grand cercle (m) entre deux points (haversine). */
export function haversineDistanceM(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * DEG, φ2 = lat2 * DEG;
  const dφ = (lat2 - lat1) * DEG, dλ = (lon2 - lon1) * DEG;
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* ------------------------------------------------------------------ */
/* Plate scale caméra — pour graduer le réticule                       */
/* ------------------------------------------------------------------ */

/**
 * Degrés par pixel au centre de l'image, pour un FOV horizontal (deg)
 * et une largeur d'image (px). Approximation valable près de l'axe.
 */
export function degPerPixel(hfovDeg, widthPx) {
  const f = widthPx / 2 / Math.tan((hfovDeg * DEG) / 2); // focale en px
  return Math.atan(1 / f) * RAD;
}
