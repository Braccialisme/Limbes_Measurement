import { useState } from 'react';
import MeasureCursors from './MeasureCursors.jsx';
import { angularWidthDeg, degPerScreenPx } from '../lib/geometry.js';

/**
 * Calibration du FOV — deux voies :
 *  1. FOV DIRECT : tu tapes le champ de vision horizontal de l'objectif
 *     (documenté pour la plupart des tél, ~65-70° pour le principal). Le plus
 *     FIABLE — aucune erreur de curseur. deg/px = FOV / largeur écran.
 *  2. Par RÉFÉRENCE : encadrer un objet de taille+distance connues entre deux
 *     curseurs. Pratique mais sensible : objet large, loin, mesuré au mètre.
 * Un garde-fou signale un FOV improbable (hors ~40-90°).
 */
const FOV_MIN = 40, FOV_MAX = 90; // plage plausible d'un objectif de tél

export default function Calibration({ onSave, onCancel, current }) {
  const W = window.innerWidth;
  const [fovDirect, setFovDirect] = useState('');
  const [sizeM, setSizeM] = useState('');
  const [distM, setDistM] = useState('');
  const [spanPx, setSpanPx] = useState(0);

  // Voie 1 : FOV direct.
  const fovD = Number(fovDirect);
  const directOk = fovD >= 20 && fovD <= 150;

  // Voie 2 : référence.
  const angle =
    Number(sizeM) > 0 && Number(distM) > 0
      ? angularWidthDeg(Number(sizeM), Number(distM))
      : null;
  const refReady = angle != null && spanPx > 4;
  const degPerPxRef = refReady ? degPerScreenPx(angle, spanPx) : null;
  const hfovRef = degPerPxRef != null ? degPerPxRef * W : null;
  const implausible = hfovRef != null && (hfovRef < FOV_MIN || hfovRef > FOV_MAX);

  return (
    <>
      <MeasureCursors onSpan={setSpanPx} />
      <div className="panel cal-panel">
        <div className="panel-title">Calibration du FOV</div>

        {/* Voie 1 — FOV direct */}
        <p className="hint">
          Le plus fiable : saisis le champ de vision horizontal de l'objectif
          (cherche « {'{'}ton tél{'}'} camera FOV » — souvent 65-70°).
        </p>
        <div className="row">
          <label className="cell">
            <span className="label">FOV direct (°)</span>
            <input className="eye-input" type="number" inputMode="decimal"
              min="20" max="150" step="0.5" value={fovDirect}
              onChange={(e) => setFovDirect(e.target.value)} />
          </label>
          <button className="btn primary" disabled={!directOk}
            onClick={() => onSave({ degPerPx: fovD / W, refDeg: fovD, refPx: W, mode: 'direct' })}>
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
            largeur {angle.toFixed(2)}° sur {Math.round(spanPx)} px → FOV écran
            ≈ {hfovRef.toFixed(0)}°
            {implausible ? ' — improbable ! objet/distance douteux, recommence' : ''}
          </p>
        )}
        {current && (
          <p className="hint">
            actuel : FOV ≈ {(current.degPerPx * W).toFixed(0)}°
            {current.mode === 'direct' ? ' (direct)' : ' (référence)'}
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
