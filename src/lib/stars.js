/**
 * Petit catalogue d'étoiles brillantes (J2000, RA/Dec en degrés) + séparation
 * angulaire entre deux. Sert à calibrer le FOV de nuit : la séparation d'une
 * paire est CONNUE et fixe ; on la mesure en pixels sur l'image → deg/px.
 * Plus précis que tout le reste (angles vrais du ciel, aucune contrainte).
 */
export const STARS = [
  { name: 'Sirius', ra: 101.287, dec: -16.716 },
  { name: 'Canopus', ra: 95.988, dec: -52.696 },
  { name: 'Rigel', ra: 78.634, dec: -8.202 },
  { name: 'Bételgeuse', ra: 88.793, dec: 7.407 },
  { name: 'Capella', ra: 79.172, dec: 45.998 },
  { name: 'Aldébaran', ra: 68.980, dec: 16.509 },
  { name: 'Procyon', ra: 114.825, dec: 5.225 },
  { name: 'Pollux', ra: 116.329, dec: 28.026 },
  { name: 'Véga', ra: 279.234, dec: 38.784 },
  { name: 'Altaïr', ra: 297.696, dec: 8.868 },
  { name: 'Deneb', ra: 310.358, dec: 45.280 },
  { name: 'Arcturus', ra: 213.915, dec: 19.182 },
  { name: 'Spica', ra: 201.298, dec: -11.161 },
  { name: 'Antarès', ra: 247.352, dec: -26.432 },
  { name: 'Polaris', ra: 37.954, dec: 89.264 },
];

const D2R = Math.PI / 180;

/** Séparation angulaire (deg) entre deux étoiles {ra, dec}. */
export function starSeparationDeg(a, b) {
  const c = Math.sin(a.dec * D2R) * Math.sin(b.dec * D2R)
    + Math.cos(a.dec * D2R) * Math.cos(b.dec * D2R) * Math.cos((a.ra - b.ra) * D2R);
  return Math.acos(Math.max(-1, Math.min(1, c))) / D2R;
}
