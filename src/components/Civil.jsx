import { useState } from 'react';
import MeasureCursors from './MeasureCursors.jsx';
import {
  formatDMS,
  spanToAngleDeg,
  physicalSizeToDistanceM,
  angularSizeToPhysicalM,
} from '../lib/geometry.js';

/**
 * Mode civil / urbain : mesure d'une largeur angulaire à l'écran (curseurs)
 * puis, avec UNE référence connue :
 *   - taille connue  → distance de l'objet,
 *   - distance connue → taille de l'objet.
 * Nécessite un objectif calibré (échelle deg/px).
 */
export default function Civil({ cal, onCalibrate, onSave, videoRef }) {
  const [spanPx, setSpanPx] = useState(0);
  const [mode, setMode] = useState('size'); // 'size' = taille connue | 'distance' connue
  const [val, setVal] = useState('');

  if (!cal) {
    return (
      <div className="panel">
        <div className="panel-title">Mode civil</div>
        <p className="hint">
          Mesure d'angle à l'écran — cet objectif n'est pas encore calibré.
        </p>
        <button className="btn primary" onClick={onCalibrate}>Calibrer le FOV</button>
      </div>
    );
  }

  const angle = spanToAngleDeg(spanPx, cal.degPerPx);
  const n = Number(val);
  const result =
    n > 0 && angle > 0
      ? mode === 'size'
        ? { label: 'distance', value: physicalSizeToDistanceM(n, angle) }
        : { label: 'taille', value: angularSizeToPhysicalM(angle, n) }
      : null;

  const journalize = () =>
    onSave({
      kind: 'civil',
      label: mode === 'size' ? 'distance (taille connue)' : 'taille (distance connue)',
      detail: `${angle.toFixed(2)}° · ${n} m → ${result.value.toFixed(2)} m`,
    });

  return (
    <>
      <MeasureCursors onSpan={setSpanPx} videoRef={videoRef} />
      <div className="panel">
        <div className="panel-title">Civil — largeur à l'écran</div>
        <div className="row">
          <div className="cell">
            <span className="label">Angle mesuré</span>
            <span className="value">{formatDMS(angle)}</span>
          </div>
          <div className="cell">
            <span className="label">Je connais</span>
            <span className="presets">
              <button className={`chip${mode === 'size' ? ' active' : ''}`}
                onClick={() => setMode('size')}>la taille</button>
              <button className={`chip${mode === 'distance' ? ' active' : ''}`}
                onClick={() => setMode('distance')}>la distance</button>
            </span>
          </div>
          <label className="cell">
            <span className="label">{mode === 'size' ? 'Taille (m)' : 'Distance (m)'}</span>
            <input className="eye-input" type="number" inputMode="decimal"
              min="0" step="0.01" value={val}
              onChange={(e) => setVal(e.target.value)} />
          </label>
        </div>
        {result && (
          <p className="hint ok">
            {result.label} ≈ {result.value.toFixed(2)} m
          </p>
        )}
        <div className="row measure">
          <button className="btn" disabled={!result} onClick={journalize}>
            Journaliser
          </button>
          <span className="hint">écart {Math.round(spanPx)} px</span>
        </div>
      </div>
    </>
  );
}
