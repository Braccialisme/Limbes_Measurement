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

// Hauteurs d'œil typiques (m). Le sol reste à ~0 en cas mer/plage ;
// pour digue/dune, l'utilisateur ajuste au clavier. Presets = raccourcis.
const EYE_PRESETS = [
  { label: 'assis', m: 1.1 },
  { label: 'debout', m: 1.6 },
  { label: 'pont', m: 3 },
  { label: 'dune', m: 10 },
];

export default function Readout({
  elevationDeg, rollDeg, headingDeg, headingSource,
  fix, gpsError, cal, eyeHeightM, onEyeHeight,
  markA, markB, separationDeg, onMark, onClearMarks, onSaveMeasure,
}) {
  const dHorizon = horizonDistanceKm(eyeHeightM);
  const fovDeg = cal ? cal.degPerPx * window.innerWidth : null;

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
          <span className="presets">
            {EYE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`chip${Math.abs(eyeHeightM - p.m) < 0.01 ? ' active' : ''}`}
                onClick={() => onEyeHeight(p.m)}
                title={`${p.m} m`}
              >
                {p.label}
              </button>
            ))}
          </span>
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
              : gpsError || 'recherche…'}
          </span>
          {fix && gpsError && (
            <span className="hint">{gpsError}</span>
          )}
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
        {separationDeg != null && (
          <button className="btn ghost" onClick={onSaveMeasure} title="journaliser">＋</button>
        )}
        {(markA || markB) && (
          <button className="btn ghost" onClick={onClearMarks}>×</button>
        )}
      </div>

      <div className="row footer">
        <span className="hint">
          FOV : {fovDeg ? `calibré ≈ ${fovDeg.toFixed(0)}°` : 'non calibré — bouton FOV'}
        </span>
      </div>
    </div>
  );
}
