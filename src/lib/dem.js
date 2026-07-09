/**
 * dem.js — modèle numérique de terrain (phase 2, le cas "château").
 * Fonctions pures : décodage terrarium, maths de tuiles slippy, et le
 * ray-march qui trouve où la ligne de visée percute le relief.
 * Le fetch/cache des tuiles et le canvas vivent ailleurs (effets de bord) ;
 * ici tout est testable en injectant un échantillonneur `sample(lat,lon)`.
 */
import { DEG, EARTH_R_EFF, destinationPoint, targetAltitudeDeltaM } from './geometry.js';

/**
 * Décodage terrarium (AWS Terrain Tiles) : altitude en mètres depuis un
 * pixel RGB. height = R*256 + G + B/256 − 32768. Deux lignes, comme promis.
 */
export function decodeTerrarium(r, g, b) {
  return r * 256 + g + b / 256 - 32768;
}

/**
 * (lat, lon) → coordonnées pixel GLOBALES au zoom z (projection Web Mercator
 * slippy). tileSize par défaut 256. La partie entière / tileSize donne la
 * tuile, le reste donne le pixel dans la tuile.
 */
export function lngLatToGlobalPixel(latDeg, lonDeg, z, tileSize = 256) {
  const n = tileSize * Math.pow(2, z);
  const x = ((lonDeg + 180) / 360) * n;
  const latRad = latDeg * DEG;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

/** Tuile {z,x,y} contenant (lat,lon). */
export function tileFor(latDeg, lonDeg, z, tileSize = 256) {
  const p = lngLatToGlobalPixel(latDeg, lonDeg, z, tileSize);
  return { z, x: Math.floor(p.x / tileSize), y: Math.floor(p.y / tileSize) };
}

/**
 * Interpolation bilinéaire de 4 altitudes voisines. fx, fy ∈ [0,1] = position
 * fractionnaire entre les pixels. Lisse le relief au lieu de sauter d'un
 * pixel à l'autre (fini l'effet escalier du plus-proche-voisin).
 */
export function bilinear(v00, v10, v01, v11, fx, fy) {
  const top = v00 + (v10 - v00) * fx;
  const bot = v01 + (v11 - v01) * fx;
  return top + (bot - top) * fy;
}

/**
 * Ray-march de la ligne de visée sur le relief.
 * Depuis (lat, lon, observerAltM = sol DEM + hauteur d'œil), on marche le
 * long de l'azimut par pas `stepM`. À chaque pas, l'altitude de la ligne de
 * visée (targetAltitudeDeltaM, courbure comprise) est comparée au sol
 * échantillonné. Première fois que la visée passe SOUS le sol = intersection.
 * Interpolation linéaire entre les deux derniers pas pour affiner.
 *
 * @param sample (lat,lon) → altitude sol (m) ou null hors couverture.
 * @returns { distanceM, altM, lat, lon } ou null (rien touché / hors DEM).
 */
export function rayMarchTerrain({
  latDeg, lonDeg, observerAltM, azimuthDeg, elevationDeg,
  sample, maxDistanceM = 60000, stepM = 25,
}) {
  let prevD = 0;
  let prevGap = observerAltM - sampleOr(sample, latDeg, lonDeg); // visée − sol
  // Si l'observateur est déjà sous le sol (donnée douteuse), on part quand même.

  for (let d = stepM; d <= maxDistanceM; d += stepM) {
    const p = destinationPoint(latDeg, lonDeg, azimuthDeg, d);
    const ground = sample(p.latDeg, p.lonDeg);
    if (ground == null) return null; // sorti de la couverture DEM
    const rayAlt = observerAltM + targetAltitudeDeltaM(d, elevationDeg);
    const gap = rayAlt - ground;

    if (gap <= 0) {
      // croisement entre prevD (gap>0) et d (gap<=0) : interpolation
      const t = prevGap / (prevGap - gap); // 0..1
      const hitD = prevD + t * (d - prevD);
      const hit = destinationPoint(latDeg, lonDeg, azimuthDeg, hitD);
      return {
        distanceM: hitD,
        altM: observerAltM + targetAltitudeDeltaM(hitD, elevationDeg),
        lat: hit.latDeg,
        lon: hit.lonDeg,
      };
    }
    prevD = d;
    prevGap = gap;
  }
  return null; // ligne de visée n'a rien percuté dans la portée
}

function sampleOr(sample, lat, lon) {
  const v = sample(lat, lon);
  return v == null ? 0 : v;
}

/**
 * Angle d'élévation apparent (deg) d'un point de sol à distance d, altitude g,
 * vu d'un observateur à observerAltM — dip de courbure inclus :
 *   elev = atan( (g − obs)/d − d/(2R') )
 * Le terme −d/(2R') abaisse l'horizon lointain (la Terre se dérobe).
 */
export function apparentElevationDeg(groundAltM, observerAltM, distanceM) {
  if (distanceM <= 0) return 0;
  const slope = (groundAltM - observerAltM) / distanceM - distanceM / (2 * EARTH_R_EFF);
  return Math.atan(slope) * (180 / Math.PI);
}

/**
 * Profil de crête (silhouette) à 360° depuis (lat, lon). Pour chaque azimut,
 * marche le long du rayon et garde l'angle d'élévation MAX du sol → la ligne
 * d'horizon terrestre. Sert au recalage d'azimut : on superpose ce profil au
 * liveview, l'utilisateur le fait coïncider avec la vraie crête → offset.
 *
 * @returns tableau { azDeg, elevDeg } (elevDeg = skyline, peut être négatif).
 */
export function crestProfile({
  latDeg, lonDeg, observerAltM, sample,
  azStepDeg = 1, maxDistanceM = 40000, stepM = 60,
}) {
  const profile = [];
  for (let az = 0; az < 360; az += azStepDeg) {
    let maxElev = -90;
    for (let d = stepM; d <= maxDistanceM; d += stepM) {
      const p = destinationPoint(latDeg, lonDeg, az, d);
      const g = sample(p.latDeg, p.lonDeg);
      if (g == null) break; // hors couverture : on arrête ce rayon
      const elev = apparentElevationDeg(g, observerAltM, d);
      if (elev > maxElev) maxElev = elev;
    }
    profile.push({ azDeg: az, elevDeg: maxElev });
  }
  return profile;
}

/** Rappel : rayon terrestre effectif utilisé (avec réfraction). */
export const DEM_EARTH_R_EFF = EARTH_R_EFF;
