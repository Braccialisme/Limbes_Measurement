import { useState } from 'react';
import MeasureCursors from './MeasureCursors.jsx';
import {
  spanToAngleDeg, seaObjectEstimate, horizonDistanceKm,
  distanceFromWaterlineDipM, heightFromElevationsM, formatDMS,
} from '../lib/geometry.js';

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
export default function Mer({ cal, eyeHeightM, elevationDeg, onCalibrate, onSave, videoRef }) {
  const [spanPx, setSpanPx] = useState(0);
  const [waterline, setWaterline] = useState(true);
  // Visées d'élévation (méthode dépression, sans FOV).
  const [wlDeg, setWlDeg] = useState(null);   // élévation de la flottaison (négative)
  const [topDeg, setTopDeg] = useState(null); // élévation du sommet

  const dHorizon = horizonDistanceKm(eyeHeightM);

  // Distance depuis la dépression de flottaison (pitch précis, pas de FOV).
  const distM = wlDeg != null && wlDeg < 0
    ? distanceFromWaterlineDipM(-wlDeg, eyeHeightM) : null;
  const heightM = distM != null && topDeg != null
    ? heightFromElevationsM(distM, wlDeg, topDeg) : null;

  const aimWaterline = () => {
    if (elevationDeg == null) return;
    setWlDeg(elevationDeg); setTopDeg(null);
  };
  const aimTop = () => {
    if (elevationDeg == null || wlDeg == null) return;
    setTopDeg(elevationDeg);
    const d = distanceFromWaterlineDipM(-wlDeg, eyeHeightM);
    if (d != null) {
      const h = heightFromElevationsM(d, wlDeg, elevationDeg);
      onSave({ kind: 'mer', label: 'objet en mer (dépression)',
        detail: `${(d / 1000).toFixed(2)} km · haut ${h.toFixed(1)} m` });
    }
  };

  const angle = cal ? spanToAngleDeg(spanPx, cal.degPerPx) : null;
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
      {cal && <MeasureCursors onSpan={setSpanPx} videoRef={videoRef} />}
      <div className="panel">
        <div className="panel-title">Mer — distance &amp; hauteur</div>

        {/* Méthode dépression (pitch, sans FOV) : LA distance marine. */}
        <p className="hint">
          Flottaison visible ? Vise-la, puis le sommet → distance (par la
          dépression) et hauteur. Précis, sans calibration.
        </p>
        <div className="row">
          <div className="cell">
            <span className="label">Horizon (œil {eyeHeightM} m)</span>
            <span className="value">{dHorizon.toFixed(1)} km</span>
          </div>
          <div className="cell">
            <span className="label">Dépression flott.</span>
            <span className="value">{wlDeg != null ? formatDMS(-wlDeg) : '· · ·'}</span>
          </div>
        </div>
        {distM != null && (
          <p className="hint ok">
            distance ≈ {(distM / 1000).toFixed(2)} km
            {heightM != null && ` · hauteur ≈ ${heightM.toFixed(1)} m`}
          </p>
        )}
        {wlDeg != null && wlDeg >= 0 && (
          <p className="hint" style={{ color: 'var(--signal)' }}>
            vise SOUS l'horizontale (la flottaison est en contrebas).
          </p>
        )}
        {wlDeg != null && wlDeg < 0 && distM == null && (
          <p className="hint" style={{ color: 'var(--signal)' }}>
            flottaison au-delà de l'horizon → non mesurable (objet trop loin).
          </p>
        )}
        <div className="row measure">
          <button className="btn" onClick={aimWaterline}>Viser flottaison</button>
          <button className="btn" disabled={wlDeg == null} onClick={aimTop}>Viser sommet</button>
        </div>

        {/* Diagnostic largeur (curseurs, nécessite le FOV calibré). */}
        {cal ? (
          <>
            <div className="row">
              <div className="cell">
                <span className="label">Largeur</span>
                <span className="value">{angle.toFixed(2)}°</span>
              </div>
              <div className="cell">
                <span className="label">Flottaison visible ?</span>
                <span className="presets">
                  <button className={`chip${waterline ? ' active' : ''}`} onClick={() => setWaterline(true)}>oui</button>
                  <button className={`chip${!waterline ? ' active' : ''}`} onClick={() => setWaterline(false)}>non</button>
                </span>
              </div>
              <button className="btn" disabled={!est} onClick={journalize}>Journaliser largeur</button>
            </div>
            {est && est.kind === 'within-horizon' && (
              <p className="hint ok">taille ≤ {Math.round(est.maxSizeM)} m (en deçà de l'horizon).</p>
            )}
            {est && est.kind === 'beyond-horizon' && (
              <p className="hint ok">
                taille AU MOINS {Math.round(est.minSizeM)} m (coque tranchée).
                {est.minSizeM > 40 ? ' Trop gros pour un chalutier.' : ''}
              </p>
            )}
          </>
        ) : (
          <p className="hint">
            Largeur → taille : nécessite un objectif calibré.{' '}
            <button className="chip" onClick={onCalibrate}>calibrer</button>
          </p>
        )}
      </div>
    </>
  );
}
