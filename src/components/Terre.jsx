import { useState } from 'react';
import { rayMarchTerrain } from '../lib/dem.js';
import { heightFromElevationsM } from '../lib/geometry.js';

/**
 * Mode Terre — le cas "château sur la colline d'en face".
 * 1. Télécharger le MNT de sa région (une fois, puis offline).
 * 2. Viser la BASE de la cible → ray-march le long de l'azimut → distance à
 *    vol d'oiseau + altitude du point visé.
 * 3. Viser le SOMMET → hauteur du bâtiment (différence d'élévations à
 *    distance connue). Le MNT ne s'affiche jamais : lookup silencieux.
 */
export default function Terre({ fix, headingDeg, headingSource, elevationDeg, eyeHeightM, dem, onSave }) {
  const [base, setBase] = useState(null);   // { distanceM, altM, elevDeg }
  const [summit, setSummit] = useState(null); // { elevDeg, heightM }

  if (!fix) {
    return (
      <div className="panel">
        <div className="panel-title">Terre — château</div>
        <p className="hint">Position GPS requise. Sors ou attends un fix.</p>
      </div>
    );
  }

  const azOk = headingSource === 'compass' || headingSource === 'absolute';
  const observerGround = dem.ready ? dem.sample(fix.lat, fix.lon) : null;
  const observerAlt = (observerGround ?? 0) + eyeHeightM;

  const aimBase = () => {
    if (headingDeg == null || elevationDeg == null) return;
    const hit = rayMarchTerrain({
      latDeg: fix.lat, lonDeg: fix.lon, observerAltM: observerAlt,
      azimuthDeg: headingDeg, elevationDeg, sample: dem.sample,
    });
    setSummit(null);
    setBase(hit ? { ...hit, elevDeg: elevationDeg } : 'miss');
  };

  const aimSummit = () => {
    if (!base || base === 'miss' || elevationDeg == null) return;
    const h = heightFromElevationsM(base.distanceM, base.elevDeg, elevationDeg);
    setSummit({ elevDeg: elevationDeg, heightM: h });
  };

  const journalize = () => {
    if (!base || base === 'miss') return;
    const km = (base.distanceM / 1000).toFixed(2);
    onSave({
      kind: 'terre',
      label: 'château (DEM)',
      detail:
        `${km} km · alt ${Math.round(base.altM)} m` +
        (summit ? ` · haut ${summit.heightM.toFixed(1)} m` : ''),
    });
  };

  return (
    <div className="panel">
      <div className="panel-title">Terre — château</div>

      {!dem.ready ? (
        <>
          <p className="hint">
            {dem.loading
              ? `Téléchargement du relief… ${dem.progress}%`
              : dem.error
                ? `Erreur : ${dem.error}`
                : 'MNT non chargé pour cette zone.'}
          </p>
          <button className="btn primary" disabled={dem.loading}
            onClick={() => dem.downloadRegion(fix.lat, fix.lon)}>
            {dem.loading ? `${dem.progress}%` : 'Télécharger ma région (~1 Mo)'}
          </button>
        </>
      ) : (
        <>
          {!azOk && (
            <p className="hint" style={{ color: 'var(--signal)' }}>
              azimut non absolu ({headingSource}) → distance peu fiable.
              Recalage par silhouette prévu.
            </p>
          )}
          <div className="row">
            <div className="cell">
              <span className="label">Sol observateur</span>
              <span className="value">{observerGround == null ? '—' : `${Math.round(observerGround)} m`}</span>
            </div>
            <div className="cell">
              <span className="label">Œil (alt)</span>
              <span className="value">{Math.round(observerAlt)} m</span>
            </div>
          </div>

          {base && base !== 'miss' && (
            <div className="row">
              <div className="cell">
                <span className="label">Distance</span>
                <span className="value">{(base.distanceM / 1000).toFixed(2)} km</span>
              </div>
              <div className="cell">
                <span className="label">Alt. cible</span>
                <span className="value">{Math.round(base.altM)} m</span>
              </div>
              {summit && (
                <div className="cell">
                  <span className="label">Hauteur</span>
                  <span className="value">{summit.heightM.toFixed(1)} m</span>
                </div>
              )}
            </div>
          )}
          {base === 'miss' && (
            <p className="hint">Ligne de visée n'a rien percuté (ciel, ou hors zone chargée).</p>
          )}

          <div className="row measure">
            <button className="btn" onClick={aimBase}>Viser base</button>
            <button className="btn" disabled={!base || base === 'miss'} onClick={aimSummit}>Viser sommet</button>
            <button className="btn ghost" disabled={!base || base === 'miss'} onClick={journalize}>＋</button>
          </div>
        </>
      )}
    </div>
  );
}
