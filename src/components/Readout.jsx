import {
  formatDMS,
  horizonDistanceKm,
  angularSizeToPhysicalM,
} from '../lib/geometry.js';

const HEADING_LABEL = {
  compass: 'compas',
  absolute: 'abs',
  relative: 'REL — repère arbitraire',
  none: '—',
};

export default function Readout({
  elevationDeg, rollDeg, headingDeg, headingSource,
  fix, eyeHeightM, onEyeHeight,
  markA, markB, separationDeg, onMark, onClearMarks,
}) {
  const dHorizon = horizonDistanceKm(eyeHeightM);

  return (
    <div className="readout">
      <div className="row primary">
        <div className="cell">
          <span className="label">Élévation</span>
          <span className="value">
            {elevationDeg == null ? '· · ·' : formatDMS(elevationDeg)}
          </span>
        </div>
        <div className="cell">
          <span className="label">Azimut ({HEADING_LABEL[headingSource]})</span>
          <span className="value">
            {headingDeg == null ? '· · ·' : `${headingDeg.toFixed(1)}°`}
          </span>
        </div>
        <div className="cell">
          <span className="label">Roll</span>
          <span className="value">
            {rollDeg == null ? '· · ·' : `${rollDeg.toFixed(1)}°`}
          </span>
        </div>
      </div>

      <div className="row">
        <div className="cell">
          <span className="label">Œil (m)</span>
          <input
            className="eye-input"
            type="number" min="0.5" max="500" step="0.1"
            value={eyeHeightM}
            onChange={(e) => onEyeHeight(Number(e.target.value) || 0)}
          />
        </div>
        <div className="cell">
          <span className="label">Horizon</span>
          <span className="value">{dHorizon.toFixed(1)} km</span>
        </div>
        <div className="cell">
          <span className="label">GPS</span>
          <span className="value small">
            {fix
              ? `${fix.lat.toFixed(4)}, ${fix.lon.toFixed(4)} ±${Math.round(fix.accuracyM)}m`
              : 'recherche…'}
          </span>
        </div>
      </div>

      <div className="row measure">
        <button className="btn" onClick={onMark}>
          {!markA ? 'Viser A' : !markB ? 'Viser B' : 'Refaire'}
        </button>
        {separationDeg != null && (
          <div className="cell grow">
            <span className="label">Séparation A→B</span>
            <span className="value">{formatDMS(separationDeg)}</span>
            <span className="hint">
              taille si à l'horizon ({dHorizon.toFixed(1)} km) :{' '}
              {Math.round(angularSizeToPhysicalM(separationDeg, dHorizon * 1000))} m
              {' '}— plancher si au-delà
            </span>
          </div>
        )}
        {(markA || markB) && (
          <button className="btn ghost" onClick={onClearMarks}>×</button>
        )}
      </div>
    </div>
  );
}
