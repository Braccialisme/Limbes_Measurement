import { useState } from 'react';
import MeasureCursors from './MeasureCursors.jsx';
import { spanToAngleDeg, seaObjectEstimate, horizonDistanceKm } from '../lib/geometry.js';

/**
 * Mode mer — le cas fondateur nº1 : « lumières trop grosses pour des bateaux
 * de pêche ». On mesure la largeur angulaire de l'objet (curseurs), on dit si
 * sa ligne de FLOTTAISON est visible, et le diagnostic binaire tranche :
 *   - flottaison visible → en deçà de l'horizon → distance & taille MAX ;
 *   - coque tranchée par l'horizon → au-delà → distance & taille PLANCHER
 *     (« au moins ça » — c'est le plancher qui dit « trop gros pour un
 *     chalutier »).
 * La hauteur d'œil (mémorisée) donne l'horizon.
 */
export default function Mer({ cal, eyeHeightM, onCalibrate, onSave }) {
  const [spanPx, setSpanPx] = useState(0);
  const [waterline, setWaterline] = useState(true);

  const dHorizon = horizonDistanceKm(eyeHeightM);

  if (!cal) {
    return (
      <div className="panel">
        <div className="panel-title">Mer</div>
        <p className="hint">
          Largeur mesurée à l'écran — calibre d'abord l'objectif (bouton FOV).
        </p>
        <button className="btn primary" onClick={onCalibrate}>Calibrer le FOV</button>
      </div>
    );
  }

  const angle = spanToAngleDeg(spanPx, cal.degPerPx);
  const est = angle > 0
    ? seaObjectEstimate({ eyeHeightM, angularWidthDeg: angle, waterlineVisible: waterline })
    : null;

  const journalize = () => {
    if (!est) return;
    const detail = est.kind === 'within-horizon'
      ? `≤ ${est.maxDistanceKm.toFixed(1)} km · taille ≤ ${Math.round(est.maxSizeM)} m`
      : `≥ ${est.minDistanceKm.toFixed(1)} km · plancher ${Math.round(est.minSizeM)} m`;
    onSave({ kind: 'mer', label: 'objet en mer', detail });
  };

  return (
    <>
      <MeasureCursors onSpan={setSpanPx} />
      <div className="panel">
        <div className="panel-title">Mer — objet trop gros ?</div>
        <div className="row">
          <div className="cell">
            <span className="label">Largeur</span>
            <span className="value">{angle.toFixed(2)}°</span>
          </div>
          <div className="cell">
            <span className="label">Horizon (œil {eyeHeightM} m)</span>
            <span className="value">{dHorizon.toFixed(1)} km</span>
          </div>
          <div className="cell">
            <span className="label">Flottaison visible ?</span>
            <span className="presets">
              <button className={`chip${waterline ? ' active' : ''}`} onClick={() => setWaterline(true)}>oui</button>
              <button className={`chip${!waterline ? ' active' : ''}`} onClick={() => setWaterline(false)}>non</button>
            </span>
          </div>
        </div>

        {est && est.kind === 'within-horizon' && (
          <p className="hint ok">
            En deçà de l'horizon : à ≤ {est.maxDistanceKm.toFixed(1)} km,
            taille ≤ {Math.round(est.maxSizeM)} m.
          </p>
        )}
        {est && est.kind === 'beyond-horizon' && (
          <p className="hint ok">
            Coque tranchée → au-delà de l'horizon : à ≥ {est.minDistanceKm.toFixed(1)} km,
            taille AU MOINS {Math.round(est.minSizeM)} m.
            {est.minSizeM > 40 ? ' Trop gros pour un chalutier.' : ''}
          </p>
        )}

        <div className="row measure">
          <button className="btn" disabled={!est} onClick={journalize}>Journaliser</button>
          <span className="hint">écart {Math.round(spanPx)} px</span>
        </div>
      </div>
    </>
  );
}
