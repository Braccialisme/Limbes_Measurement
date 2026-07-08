import { useState } from 'react';
import MeasureCursors from './MeasureCursors.jsx';
import { angularWidthDeg, degPerScreenPx } from '../lib/geometry.js';

/**
 * Écran de calibration du FOV. On encadre entre les deux curseurs un objet
 * dont on connaît la TAILLE et la DISTANCE (une porte à 3 m, un panneau, une
 * fenêtre…), on saisit les deux → échelle écran deg/px. Auto-corrige le
 * recadrage : c'est l'angle réel par pixel affiché. Le liveview reste celui
 * de l'App, en dessous.
 */
export default function Calibration({ onSave, onCancel, current }) {
  const [sizeM, setSizeM] = useState('');
  const [distM, setDistM] = useState('');
  const [spanPx, setSpanPx] = useState(0);

  const angle =
    Number(sizeM) > 0 && Number(distM) > 0
      ? angularWidthDeg(Number(sizeM), Number(distM))
      : null;
  const ready = angle != null && spanPx > 4;
  const degPerPx = ready ? degPerScreenPx(angle, spanPx) : null;
  const hfov = degPerPx != null ? degPerPx * window.innerWidth : null;

  return (
    <>
      <MeasureCursors onSpan={setSpanPx} />
      <div className="panel cal-panel">
        <div className="panel-title">Calibration du FOV</div>
        <p className="hint">
          Encadre un objet de taille et distance connues entre les curseurs
          A et B, puis saisis-les.
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
        {ready && (
          <p className="hint ok">
            largeur {angle.toFixed(2)}° sur {Math.round(spanPx)} px →
            {' '}{(degPerPx * 60).toFixed(2)} ′/px · FOV écran ≈ {hfov.toFixed(0)}°
          </p>
        )}
        {current && !ready && (
          <p className="hint">
            calibration actuelle : FOV écran ≈
            {' '}{(current.degPerPx * window.innerWidth).toFixed(0)}°
          </p>
        )}
        <div className="row measure">
          <button className="btn" onClick={onCancel}>Fermer</button>
          <button className="btn primary" disabled={!ready}
            onClick={() => onSave({ degPerPx, refDeg: angle, refPx: spanPx })}>
            Enregistrer
          </button>
        </div>
      </div>
    </>
  );
}
