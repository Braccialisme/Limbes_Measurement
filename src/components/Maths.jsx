import {
  EARTH_R,
  REFRACTION_K,
  EARTH_R_EFF,
  horizonDistanceKm,
  horizonDipDeg,
  formatDMS,
} from '../lib/geometry.js';

/**
 * Annexe « Maths » : les formules réellement utilisées par l'instrument,
 * importées de geometry.js (constantes + fonctions live) pour que la doc ne
 * dérive jamais du code. Chaque bloc : la formule, le pourquoi, et quand
 * c'est possible la valeur COURANTE injectée (ta hauteur d'œil, ton FOV…).
 */
export default function Maths({ eyeHeightM, cal, night, onToggleNight }) {
  const dHorizon = horizonDistanceKm(eyeHeightM);
  const dip = horizonDipDeg(eyeHeightM);
  const fovDeg = cal ? cal.degPerPx * window.innerWidth : null;

  const items = [
    {
      title: 'Constantes',
      formula: `R = ${(EARTH_R / 1000).toFixed(0)} km   k = ${REFRACTION_K}\nR' = R / (1 − k) = ${(EARTH_R_EFF / 1000).toFixed(0)} km`,
      why: 'Rayon terrestre moyen ; k = réfraction atmosphérique standard. R′ = rayon effectif : la lumière courbe vers le bas, la Terre paraît plus plate.',
    },
    {
      title: 'Distance de l’horizon',
      formula: 'd = √(2·R′·h)   ≈ 3.86·√h  (km, h en m)',
      why: 'Ce que tu peux voir avant que la courbure te cache la surface.',
      live: `h = ${eyeHeightM} m  →  d ≈ ${dHorizon.toFixed(2)} km`,
    },
    {
      title: 'Dip de l’horizon (et son inverse)',
      formula: 'dip = √(2h/R′)      h = R′·dip²/2',
      why: 'Abaissement de l’horizon sous l’horizontale vraie (correction sextant). L’inverse déduit la hauteur d’œil d’un dip mesuré — utile seulement en hauteur (falaise).',
      live: `h = ${eyeHeightM} m  →  dip ≈ ${formatDMS(dip)}`,
    },
    {
      title: 'Hauteur cachée par la courbure',
      formula: 'hcach ≈ d² / (2·R′) ≈ 0.0675·d²  (m, d en km)',
      why: 'Coque d’un objet situé d km au-delà de ton horizon, avalée par la Terre.',
    },
    {
      title: 'Angle ↔ taille ↔ distance',
      formula: 'taille = 2·D·tan(θ/2)      D = taille / (2·tan(θ/2))',
      why: 'Petit angle exact via tangente. Une caméra mesure un ANGLE ; il faut D ou la taille connus pour passer à l’autre.',
    },
    {
      title: 'Hauteur d’un objet',
      formula: 'h = D·(tanθ_haut − tanθ_bas)',
      why: 'Base + sommet à distance D. La courbure s’annule dans la différence.',
    },
    {
      title: 'Séparation angulaire A→B',
      formula: 'cos(sep) = sin e₁·sin e₂ + cos e₁·cos e₂·cos(Δaz)',
      why: 'Loi des cosinus sphérique entre deux visées (élévation e, azimut az). LA mesure du sextant : viser A, tap, viser B, tap.',
    },
    {
      title: 'Calibration écran',
      formula: 'deg/px = angle_connu / span_px      angle = span·deg/px',
      why: 'On encadre un objet de largeur angulaire connue → échelle deg par pixel affiché (auto-corrige le recadrage). Mesure ensuite tout angle à l’écran.',
      live: fovDeg ? `FOV écran calibré ≈ ${fovDeg.toFixed(0)}°` : 'objectif non calibré',
    },
    {
      title: 'Altitude du point visé',
      formula: 'Δalt = D·tanθ + D² / (2·R′)',
      why: 'Élévation du point visé au-dessus de toi, courbure comprise. Prêt pour le ray-march DEM (phase 2).',
    },
  ];

  return (
    <div className="maths-sheet">
      <div className="panel-title">Limbe — mode d’emploi &amp; maths</div>

      <div className="row">
        <div className="cell">
          <span className="label">Réglages</span>
          <span className="presets">
            <button className={`chip${night ? ' active' : ''}`} onClick={onToggleNight}>
              mode nuit rouge {night ? '●' : '○'}
            </button>
          </span>
        </div>
      </div>

      <div className="maths-intro">
        <p>
          <b>Limbe</b> = un sextant, un pélorus et une table d’almanach
          numérisés. Le téléphone superpose un instrument de visée au flux
          caméra pour mesurer des <b>angles</b>, puis en déduire distances et
          tailles.
        </p>
        <p>
          <b>Principe :</b> une caméra mesure toujours un ANGLE, jamais une
          distance. Pour passer à des mètres il faut une contrainte externe :
          la courbure de la Terre + ta hauteur d’œil (mer), un modèle de
          terrain + GPS (château), ou une taille/distance connue (civil).
        </p>
        <p>
          <b>Unités :</b> 1 degré (°) = 60 arcminutes (′) = 3600 arcsecondes
          (″). Fin exprès : la pleine Lune fait ≈ 0.5° (30′) ; un doigt à bout
          de bras ≈ 1.5°. Un bâtiment à 5 km sous 0.2° fait ≈ 17 m.
        </p>
        <p>
          <b>Onglets :</b> <b>Visée</b> — élévation, azimut, séparation A→B en
          deux taps. <b>Terre</b> — château via le relief (distance + hauteur).
          <b>Civil</b> — largeur à l’écran (appart, rue). <b>Journal</b> — tes
          mesures horodatées. <b>Maths</b> — ici.
        </p>
        <p className="hint">
          Le plus fiable = l’élévation (accéléromètre, sub-degré). Le plus
          faible = l’azimut (boussole). Distances déduites, pas mesurées : la
          précision dépend de la contrainte externe.
        </p>
      </div>

      <div className="panel-title">D’où sortent les chiffres</div>
      <div className="maths-list">
        {items.map((it) => (
          <div className="maths-item" key={it.title}>
            <div className="maths-head">{it.title}</div>
            <pre className="formula">{it.formula}</pre>
            <p className="hint">{it.why}</p>
            {it.live && <p className="hint ok">{it.live}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
