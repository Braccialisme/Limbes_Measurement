/**
 * Guide — à quoi sert chaque onglet et comment s'en servir, en clair.
 * Volontairement pédagogique : l'instrument est niche, ceci le déniche.
 */
const SECTIONS = [
  {
    t: 'En deux mots',
    d: "Limbe mesure des ANGLES avec les capteurs du téléphone (l'inclinaison est précise au sous-degré ; le cap boussole l'est moins). Une caméra ne mesure jamais une distance directement : pour passer à des mètres il faut une contrainte — la courbure de la Terre + ta hauteur d'œil (mer), un relief + GPS (terre), ou une taille/distance connue (civil).",
  },
  {
    t: 'Unités',
    d: "1° = 60 arcminutes (′) = 3600 arcsecondes (″). La pleine Lune ≈ 0,5° (30′) ; un doigt à bout de bras ≈ 1,5°. C'est fin exprès : viser bien = mesurer loin.",
  },
  {
    t: 'Visée',
    d: "L'instrument de base. Le limbe vertical à droite = ton élévation (tangage) ; l'horizon bleu se met de niveau (roll). Mesure A→B : vise un point, tape « Viser A », vise un autre, tape « Viser B » → séparation angulaire, sauvée au journal. C'est LA mesure sextant.",
  },
  {
    t: 'Terre — le château',
    d: "Distance et hauteur d'un objet lointain sur le terrain. 1) « Télécharger ma région » (relief, une fois, puis hors-ligne). 2) Vise la base → distance à vol d'oiseau + altitude. 3) Vise le sommet → hauteur du bâtiment. Si le cap est douteux, « Recaler azimut » : superpose le profil de crête et glisse-le sur la vraie crête.",
  },
  {
    t: 'Mer — trop gros ?',
    d: "Depuis la plage : mesure la largeur de l'objet (curseurs, gèle l'image), dis si sa ligne de flottaison est visible. Flottaison visible → il est en deçà de l'horizon : distance et taille MAX. Coque tranchée par l'horizon → au-delà : taille PLANCHER (« au moins ça » — assez pour dire « trop gros pour un chalutier »). Ta hauteur d'œil donne la distance d'horizon.",
  },
  {
    t: 'Ciel — almanach',
    d: "Position live du Soleil et de la Lune (hauteur, azimut) et un viseur (« → droite 12°, ↑ monte 5° ») pour les trouver. Diamètre apparent attendu à comparer à ta mesure A→B. Plus la phase de Lune et les heures de lever/coucher/culmination. Marche partout, sans réglage.",
  },
  {
    t: 'Pélorus — relèvements',
    d: "Enregistre des points GPS (un phare, un sommet). Pour chacun : le relèvement (azimut vers lui) et la distance depuis ta position, mis à jour en continu, avec l'écart à ton cap actuel.",
  },
  {
    t: 'Civil — mesures urbaines',
    d: "Largeur/distance d'objets proches (appart, rue). Mesure la largeur à l'écran (curseurs, gèle l'image pour la stabilité), donne UNE référence : taille connue → distance, ou distance connue → taille. Nécessite un objectif calibré (bouton FOV).",
  },
  {
    t: 'Calibration FOV',
    d: "Le navigateur ne donne pas le champ de vision : on le calibre une fois par objectif. 4 voies — FOV capteur (spec du tél, ~65-70°) · référence (objet taille+distance connues) · balayage (aligne un repère lointain d'un curseur à l'autre en tournant le tél) · étoiles (2 étoiles, la nuit — la plus précise). Chaque zoom/objectif se recalibre.",
  },
  {
    t: 'Journal',
    d: "Chaque mesure (séparation A→B, château) est sauvée automatiquement avec l'heure. Consultable, effaçable.",
  },
  {
    t: 'Astuces',
    d: "Tiens le tél en portrait, caméra vers la cible. Gèle l'image avant de glisser les curseurs. Recalibre le FOV si tu changes de zoom. Mode nuit rouge dans Maths. L'azimut est le maillon faible : recale-le sur la crête (Terre) quand tu peux.",
  },
];

export default function Guide() {
  return (
    <div className="maths-sheet">
      <div className="panel-title">Guide — les outils &amp; leur usage</div>
      <div className="maths-list">
        {SECTIONS.map((s) => (
          <div className="maths-item" key={s.t}>
            <div className="maths-head">{s.t}</div>
            <p className="hint" style={{ fontSize: 13, color: 'var(--ivory)', lineHeight: 1.5 }}>{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
