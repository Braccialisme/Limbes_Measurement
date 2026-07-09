import { useState } from 'react';
import MeasureCursors from './MeasureCursors.jsx';
import { angularWidthDeg, degPerScreenPx } from '../lib/geometry.js';

/**
 * Calibration du FOV — CONSCIENTE DU RECADRAGE object-fit:cover.
 *
 * Le liveview est en cover : la vidéo est mise à l'échelle (facteur uniforme
 * = max) puis rognée. Le champ AFFICHÉ à l'écran ≠ champ CAPTEUR. On calcule
 * la largeur écran qu'occuperait la vidéo ENTIÈRE (dispVideoW) ; alors :
 *   - FOV capteur F connu → deg/px = F / dispVideoW  (exact malgré le rognage)
 *   - référence (curseurs) → deg/px = angle / span_px  (mesure directe, exacte)
 * L'échelle deg/px est uniforme (cover scale identique en x et y), donc elle
 * vaut aussi pour la verticale (réticule).
 */
export default function Calibration({ onSave, onCancel, current, videoRef, headingRaw }) {
  const W = window.innerWidth, H = window.innerHeight;
  const v = videoRef?.current;
  const vw = v?.videoWidth || 0, vh = v?.videoHeight || 0;
  const coverScale = vw && vh ? Math.max(W / vw, H / vh) : null;
  const dispVideoW = coverScale ? vw * coverScale : W; // largeur écran de la vidéo entière

  const [fovDirect, setFovDirect] = useState('');
  const [sizeM, setSizeM] = useState('');
  const [distM, setDistM] = useState('');
  const [spanPx, setSpanPx] = useState(0);

  // Voie 3 : balayage IMU (sans objet connu).
  const [hA, setHA] = useState(null);
  const [panDeg, setPanDeg] = useState(null);
  const markPanA = () => { setPanDeg(null); setHA(headingRaw); };
  const markPanB = () => {
    if (hA == null || headingRaw == null || spanPx <= 4) return;
    setPanDeg(Math.abs(((headingRaw - hA + 540) % 360) - 180));
  };
  const degPerPxPan = panDeg != null && spanPx > 4 ? panDeg / spanPx : null;

  // Voie 1 : FOV capteur direct → deg/px tenant compte du cover.
  const fovD = Number(fovDirect);
  const directOk = fovD >= 20 && fovD <= 150;
  const degPerPxDirect = fovD / dispVideoW;

  // Voie 2 : référence.
  const angle =
    Number(sizeM) > 0 && Number(distM) > 0
      ? angularWidthDeg(Number(sizeM), Number(distM))
      : null;
  const refReady = angle != null && spanPx > 4;
  const degPerPxRef = refReady ? degPerScreenPx(angle, spanPx) : null;
  // Champ capteur implicite = deg/px × largeur vidéo entière (garde-fou).
  const impliedFov = degPerPxRef != null ? degPerPxRef * dispVideoW : null;
  const implausible = impliedFov != null && (impliedFov < 40 || impliedFov > 130);

  const curFov = current ? current.degPerPx * dispVideoW : null;

  return (
    <>
      <MeasureCursors onSpan={setSpanPx} videoRef={videoRef} />
      <div className="panel cal-panel">
        <div className="panel-title">Calibration du FOV</div>
        {!coverScale && (
          <p className="hint" style={{ color: 'var(--signal)' }}>
            dimensions vidéo inconnues — attends l'image caméra.
          </p>
        )}

        {/* Voie 1 — FOV capteur direct */}
        <p className="hint">
          Le plus fiable : le champ horizontal de l'objectif (spec constructeur,
          souvent 65-70° pour le principal). Le recadrage est géré.
        </p>
        <div className="row">
          <label className="cell">
            <span className="label">FOV capteur (°)</span>
            <input className="eye-input" type="number" inputMode="decimal"
              min="20" max="150" step="0.5" value={fovDirect}
              onChange={(e) => setFovDirect(e.target.value)} />
          </label>
          <button className="btn primary" disabled={!directOk}
            onClick={() => onSave({ degPerPx: degPerPxDirect, refDeg: fovD, refPx: dispVideoW, mode: 'direct' })}>
            Enregistrer FOV
          </button>
        </div>

        {/* Voie 2 — par référence */}
        <p className="hint" style={{ marginTop: 6 }}>
          Ou par référence : encadre entre A et B un objet large & lointain de
          taille et distance connues (mesurées au mètre).
        </p>
        <div className="row">
          <label className="cell">
            <span className="label">Taille (m)</span>
            <input className="eye-input" type="number" inputMode="decimal"
              min="0" step="0.01" value={sizeM}
              onChange={(e) => setSizeM(e.target.value)} />
          </label>
          <label className="cell">
            <span className="label">Distance (m)</span>
            <input className="eye-input" type="number" inputMode="decimal"
              min="0" step="0.1" value={distM}
              onChange={(e) => setDistM(e.target.value)} />
          </label>
          <div className="cell">
            <span className="label">Écart</span>
            <span className="value">{Math.round(spanPx)} px</span>
          </div>
        </div>
        {refReady && (
          <p className={`hint ${implausible ? '' : 'ok'}`}
            style={implausible ? { color: 'var(--signal)' } : undefined}>
            {angle.toFixed(2)}° sur {Math.round(spanPx)} px → FOV capteur
            ≈ {impliedFov.toFixed(0)}°
            {implausible ? ' — improbable, objet/distance douteux' : ''}
          </p>
        )}
        {/* Voie 3 — balayage IMU, sans objet connu */}
        <p className="hint" style={{ marginTop: 6 }}>
          Ou balayage (capteurs, sans objet) : vise un repère LOINTAIN, mets-le
          sous le curseur A → tape, tourne le tél pour l'amener sous B → tape.
        </p>
        <div className="row measure">
          <button className="btn" onClick={markPanA}>Repère sous A</button>
          <button className="btn" disabled={hA == null} onClick={markPanB}>puis sous B</button>
          {degPerPxPan && (
            <button className="btn primary"
              onClick={() => onSave({ degPerPx: degPerPxPan, refDeg: panDeg, refPx: spanPx, mode: 'balayage' })}>
              Enreg. balayage
            </button>
          )}
        </div>
        {degPerPxPan && (
          <p className="hint ok">
            balayage {panDeg.toFixed(1)}° sur {Math.round(spanPx)} px → FOV capteur
            ≈ {(degPerPxPan * dispVideoW).toFixed(0)}°
          </p>
        )}
        {hA != null && panDeg == null && (
          <p className="hint">repère A posé — amène-le sous B et tape.</p>
        )}

        {current && (
          <p className="hint">
            actuel : FOV ≈ {curFov?.toFixed(0)}° ({current.mode || 'référence'})
          </p>
        )}

        <div className="row measure">
          <button className="btn" onClick={onCancel}>Fermer</button>
          <button className="btn primary" disabled={!refReady}
            onClick={() => onSave({ degPerPx: degPerPxRef, refDeg: angle, refPx: spanPx, mode: 'ref' })}>
            Enregistrer référence
          </button>
        </div>
      </div>
    </>
  );
}
