import { useState, useEffect, useMemo } from 'react';
import { skyPositions, moonPhase, riseSetTransit } from '../lib/astro.js';

const fmt = (d) => (d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—');
function phaseName(illum, waxing) {
  if (illum < 0.04) return 'nouvelle';
  if (illum > 0.96) return 'pleine';
  if (illum < 0.46) return waxing ? 'premier croissant' : 'dernier croissant';
  if (illum > 0.54) return waxing ? 'gibbeuse croissante' : 'gibbeuse décroissante';
  return waxing ? 'premier quartier' : 'dernier quartier';
}

/**
 * Mode Ciel — éphémérides Soleil & Lune. Position apparente (alt/az),
 * diamètre attendu (à comparer à ta mesure), et un VISEUR : l'écart entre
 * ta visée courante et l'astre, pour le trouver. Astro = angles, aucune
 * contrainte externe : ça marche partout, tout de suite.
 */
function Finder({ body, headingDeg, elevationDeg }) {
  const below = body.altDeg < 0;
  const dAz = headingDeg == null ? null : ((body.azDeg - headingDeg + 540) % 360) - 180;
  const dAlt = elevationDeg == null ? null : body.altDeg - elevationDeg;
  const aligned = dAz != null && dAlt != null && Math.abs(dAz) < 2 && Math.abs(dAlt) < 2;

  return (
    <div className="cell grow">
      <div className="row">
        <div className="cell"><span className="label">Azimut</span><span className="value">{body.azDeg.toFixed(0)}°</span></div>
        <div className="cell"><span className="label">Hauteur</span><span className="value">{body.altDeg.toFixed(0)}°</span></div>
        <div className="cell"><span className="label">Diamètre</span><span className="value">{(body.diamDeg * 60).toFixed(1)}′</span></div>
      </div>
      {below ? (
        <span className="hint">sous l'horizon</span>
      ) : aligned ? (
        <span className="hint ok">dans le viseur ✦</span>
      ) : (
        <span className="hint">
          {dAz != null && `${dAz > 0 ? '→ droite' : '← gauche'} ${Math.abs(dAz).toFixed(0)}°  `}
          {dAlt != null && `${dAlt > 0 ? '↑ monte' : '↓ descends'} ${Math.abs(dAlt).toFixed(0)}°`}
        </span>
      )}
    </div>
  );
}

export default function Ciel({ fix, headingDeg, elevationDeg }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  if (!fix) {
    return (
      <div className="panel">
        <div className="panel-title">Ciel</div>
        <p className="hint">Position GPS requise pour les éphémérides.</p>
      </div>
    );
  }

  const sky = skyPositions(new Date(), fix.lat, fix.lon);

  // Almanach du jour : ne change qu'une fois/jour → mémoïsé (le ray-scan
  // 24 h est lourd, inutile de le refaire à chaque frame d'orientation).
  const dayKey = new Date().toISOString().slice(0, 10);
  const alm = useMemo(() => ({
    phase: moonPhase(new Date()),
    sun: riseSetTransit('sun', new Date(), fix.lat, fix.lon),
    moon: riseSetTransit('moon', new Date(), fix.lat, fix.lon),
  }), [dayKey, fix.lat, fix.lon]);

  return (
    <div className="panel">
      <div className="panel-title">Ciel — Soleil &amp; Lune</div>
      <div className="row">
        <div className="cell"><span className="label">Soleil</span><span className="value">☉</span></div>
        <Finder body={sky.sun} headingDeg={headingDeg} elevationDeg={elevationDeg} />
      </div>
      <span className="hint">
        lever {fmt(alm.sun.rise)} · culmin {fmt(alm.sun.transit)} ({alm.sun.maxAltDeg.toFixed(0)}°) · coucher {fmt(alm.sun.set)}
      </span>
      <div className="row">
        <div className="cell"><span className="label">Lune</span><span className="value">☾</span></div>
        <Finder body={sky.moon} headingDeg={headingDeg} elevationDeg={elevationDeg} />
      </div>
      <span className="hint">
        {phaseName(alm.phase.illum, alm.phase.waxing)} · {(alm.phase.illum * 100).toFixed(0)}% éclairée
        {alm.phase.waxing ? ' ↑' : ' ↓'} · lever {fmt(alm.moon.rise)} · coucher {fmt(alm.moon.set)}
      </span>
      <span className="hint">
        Diamètre attendu (à comparer à ta mesure A→B) : Lune {(sky.moon.diamDeg * 60).toFixed(1)}′,
        Soleil {(sky.sun.diamDeg * 60).toFixed(1)}′.
      </span>
    </div>
  );
}
