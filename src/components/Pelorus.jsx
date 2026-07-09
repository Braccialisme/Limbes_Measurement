import { useState } from 'react';
import { bearingDeg, haversineDistanceM } from '../lib/geometry.js';

/**
 * Pélorus — enregistre des points GPS et donne, en continu, le RELÈVEMENT
 * (azimut) et la DISTANCE vers chacun depuis ta position, plus l'écart au cap
 * courant (« tourne ±X° »). Le 2e mot du nom, enfin incarné.
 */
const fmtDist = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`);

export default function Pelorus({ fix, headingDeg, waypoints }) {
  const [name, setName] = useState('');

  if (!fix) {
    return (
      <div className="panel">
        <div className="panel-title">Pélorus</div>
        <p className="hint">Position GPS requise.</p>
      </div>
    );
  }

  const save = () => {
    waypoints.add({ name: name.trim() || `point ${waypoints.list.length + 1}`, lat: fix.lat, lon: fix.lon });
    setName('');
  };

  return (
    <div className="panel">
      <div className="panel-title">Pélorus — relèvements</div>
      <div className="row">
        <label className="cell grow">
          <span className="label">Nom du point</span>
          <input className="eye-input" style={{ width: '100%' }} type="text"
            placeholder="phare, sommet…" value={name}
            onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn primary" onClick={save}>Enregistrer ici</button>
      </div>

      {waypoints.list.length === 0 ? (
        <p className="hint">Aucun point. Enregistre ta position pour t'y repérer plus tard.</p>
      ) : (
        <ul className="journal-list">
          {waypoints.list.map((w) => {
            const brg = bearingDeg(fix.lat, fix.lon, w.lat, w.lon);
            const dist = haversineDistanceM(fix.lat, fix.lon, w.lat, w.lon);
            const d = headingDeg == null ? null : ((brg - headingDeg + 540) % 360) - 180;
            return (
              <li key={w.id} className="journal-item">
                <span className="journal-body">
                  <span className="journal-label">{w.name}</span>
                  <span className="journal-detail">
                    relèvement {brg.toFixed(0)}° · {fmtDist(dist)}
                    {d != null && (
                      <> · {Math.abs(d) < 2 ? 'aligné ✦' : `${d > 0 ? '→ droite' : '← gauche'} ${Math.abs(d).toFixed(0)}°`}</>
                    )}
                  </span>
                </span>
                <button className="chip" onClick={() => waypoints.remove(w.id)}>×</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
