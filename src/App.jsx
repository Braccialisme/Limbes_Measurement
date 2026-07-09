import { useState, useCallback, useEffect } from 'react';
import { useOrientation } from './hooks/useOrientation.js';
import { useGeolocation } from './hooks/useGeolocation.js';
import { useCamera } from './hooks/useCamera.js';
import { useCalibration } from './hooks/useCalibration.js';
import { useJournal } from './hooks/useJournal.js';
import { useDem } from './hooks/useDem.js';
import { useWaypoints } from './hooks/useWaypoints.js';
import { angularSeparationDeg, formatDMS } from './lib/geometry.js';
import { crestProfile } from './lib/dem.js';
import Reticle from './components/Reticle.jsx';
import Readout from './components/Readout.jsx';
import Calibration from './components/Calibration.jsx';
import LensControl from './components/LensControl.jsx';
import Tabs from './components/Tabs.jsx';
import Civil from './components/Civil.jsx';
import Journal from './components/Journal.jsx';
import Maths from './components/Maths.jsx';
import Terre from './components/Terre.jsx';
import Mer from './components/Mer.jsx';
import Ciel from './components/Ciel.jsx';
import Pelorus from './components/Pelorus.jsx';
import Silhouette from './components/Silhouette.jsx';

// Marqueur de build : sert à vérifier qu'on n'est pas sur un cache PWA périmé.
const BUILD = '2026-07-09p · pélorus / waypoints';

export default function App() {
  const orient = useOrientation();
  const [started, setStarted] = useState(false);
  const { fix, error: gpsError } = useGeolocation(started);
  const {
    videoRef, error: camError,
    devices, deviceId, selectDevice, zoom, setZoom, lensKey,
  } = useCamera(started);

  const { cal, save: saveCal } = useCalibration(lensKey);
  const journal = useJournal();
  const dem = useDem();
  const waypoints = useWaypoints();
  const [tab, setTab] = useState('sight'); // 'sight' | 'civil' | 'journal'
  const [calOpen, setCalOpen] = useState(false);
  // Hauteur d'œil mémorisée une fois (localStorage) — plus fiable qu'un auto.
  const [eyeHeightM, setEyeHeightM] = useState(() => {
    const v = Number(localStorage.getItem('limbe.eyeHeightM'));
    return v > 0 ? v : 1.6;
  });
  const setEyeHeight = useCallback((v) => {
    setEyeHeightM(v);
    try { localStorage.setItem('limbe.eyeHeightM', String(v)); } catch { /* quota */ }
  }, []);
  const [markA, setMarkA] = useState(null);
  const [markB, setMarkB] = useState(null);

  // Offset d'azimut (recalage silhouette), persisté et appliqué au heading.
  const [azOffset, setAzOffset] = useState(() => Number(localStorage.getItem('limbe.azOffset')) || 0);
  const setOffset = useCallback((v) => {
    setAzOffset(v);
    try { localStorage.setItem('limbe.azOffset', String(v)); } catch { /* quota */ }
  }, []);
  const [silhouette, setSilhouette] = useState(null); // profil de crête | null

  // Mode nuit rouge (préserve la vision nocturne). Classe sur <html>.
  const [night, setNight] = useState(() => localStorage.getItem('limbe.night') === '1');
  useEffect(() => {
    document.documentElement.classList.toggle('night', night);
    try { localStorage.setItem('limbe.night', night ? '1' : '0'); } catch { /* quota */ }
  }, [night]);

  const headingCorrected =
    orient.headingDeg == null ? null : (orient.headingDeg + azOffset + 360) % 360;

  const start = useCallback(async () => {
    const ok = await orient.requestAccess();
    if (ok) setStarted(true);
  }, [orient]);

  const mark = useCallback(() => {
    if (orient.elevationDeg == null) return;
    const sight = {
      elevationDeg: orient.elevationDeg,
      azimuthDeg: headingCorrected ?? 0,
    };
    if (!markA) setMarkA(sight);
    else if (!markB) {
      setMarkB(sight);
      // Sauvegarde AUTO à la complétion de la paire.
      const sep = angularSeparationDeg(markA, sight);
      journal.add({ kind: 'sep', label: 'séparation A→B', detail: formatDMS(sep) });
    } else { setMarkA(sight); setMarkB(null); }
  }, [orient.elevationDeg, headingCorrected, markA, markB, journal]);

  // Calcule le profil de crête et ouvre le recalage silhouette.
  const openSilhouette = useCallback(() => {
    if (!fix || !dem.ready) return;
    const observerAlt = (dem.sample(fix.lat, fix.lon) ?? 0) + eyeHeightM;
    const profile = crestProfile({
      latDeg: fix.lat, lonDeg: fix.lon, observerAltM: observerAlt, sample: dem.sample,
    });
    setSilhouette(profile);
  }, [fix, dem, eyeHeightM]);

  const clearMarks = useCallback(() => { setMarkA(null); setMarkB(null); }, []);

  const separationDeg =
    markA && markB ? angularSeparationDeg(markA, markB) : null;

  if (!started) {
    return (
      <div className="gate">
        <svg viewBox="0 0 100 100" className="gate-icon" aria-hidden="true">
          <path d="M 15 70 A 40 40 0 0 1 85 70" fill="none" stroke="var(--brass)" strokeWidth="2.5" />
          <line x1="50" y1="70" x2="50" y2="34" stroke="var(--ivory)" strokeWidth="1.6" />
          <circle cx="50" cy="70" r="3" fill="var(--ivory)" />
        </svg>
        <h1>Limbe</h1>
        <p className="tagline">sextant · pélorus · almanach</p>
        <button className="btn primary" onClick={start}>
          Activer capteurs &amp; caméra
        </button>
        <p className="gate-note">
          iOS demandera l'accès au mouvement, à la caméra et à la position.
          Tout reste sur l'appareil.
        </p>
        <p className="build-tag">build {BUILD}</p>
      </div>
    );
  }

  return (
    <div className="instrument">
      <video ref={videoRef} autoPlay playsInline muted className="liveview" />
      {night && <div className="night-veil" />}
      {camError && <div className="cam-error">caméra : {camError}</div>}

      {calOpen ? (
        <Calibration
          current={cal}
          videoRef={videoRef}
          headingRaw={orient.headingDeg}
          onSave={(c) => { saveCal(c); setCalOpen(false); }}
          onCancel={() => setCalOpen(false)}
        />
      ) : (
        <>
          <div className="topbar">
            <div className="tb-left" />
            <Tabs tab={tab} onTab={setTab} />
            <button className="btn ghost topbtn" onClick={() => setCalOpen(true)}>
              FOV
            </button>
          </div>
          {tab !== 'journal' && tab !== 'maths' && (
            <LensControl
              devices={devices}
              deviceId={deviceId}
              onSelect={selectDevice}
              zoom={zoom}
              onZoom={setZoom}
            />
          )}

          {tab === 'sight' && (
            <>
              <Reticle
                elevationDeg={orient.elevationDeg}
                rollDeg={orient.rollDeg}
                markA={markA}
                markB={markB}
                cal={cal}
              />
              <Readout
                elevationDeg={orient.elevationDeg}
                rollDeg={orient.rollDeg}
                headingDeg={headingCorrected}
                headingSource={orient.headingSource}
                fix={fix}
                gpsError={gpsError}
                cal={cal}
                eyeHeightM={eyeHeightM}
                onEyeHeight={setEyeHeight}
                markA={markA}
                markB={markB}
                separationDeg={separationDeg}
                onMark={mark}
                onClearMarks={clearMarks}
                build={BUILD}
              />
            </>
          )}

          {tab === 'terre' && (
            <>
              <Reticle
                elevationDeg={orient.elevationDeg}
                rollDeg={orient.rollDeg}
                markA={markA}
                markB={markB}
                cal={cal}
              />
              <Terre
                fix={fix}
                headingDeg={headingCorrected}
                headingSource={orient.headingSource}
                elevationDeg={orient.elevationDeg}
                eyeHeightM={eyeHeightM}
                dem={dem}
                onSave={journal.add}
                onRecalibrate={openSilhouette}
              />
            </>
          )}

          {tab === 'mer' && (
            <Mer
              cal={cal}
              eyeHeightM={eyeHeightM}
              onCalibrate={() => setCalOpen(true)}
              onSave={journal.add}
              videoRef={videoRef}
            />
          )}

          {tab === 'ciel' && (
            <>
              <Reticle
                elevationDeg={orient.elevationDeg}
                rollDeg={orient.rollDeg}
                markA={markA}
                markB={markB}
                cal={cal}
              />
              <Ciel
                fix={fix}
                headingDeg={headingCorrected}
                elevationDeg={orient.elevationDeg}
              />
            </>
          )}

          {tab === 'pelorus' && (
            <>
              <Reticle
                elevationDeg={orient.elevationDeg}
                rollDeg={orient.rollDeg}
                markA={markA}
                markB={markB}
                cal={cal}
              />
              <Pelorus fix={fix} headingDeg={headingCorrected} waypoints={waypoints} />
            </>
          )}

          {tab === 'civil' && (
            <Civil
              cal={cal}
              onCalibrate={() => setCalOpen(true)}
              onSave={journal.add}
              videoRef={videoRef}
            />
          )}

          {tab === 'journal' && (
            <>
              <div className="sheet-bg" />
              <Journal
                entries={journal.entries}
                onRemove={journal.remove}
                onClear={journal.clear}
              />
            </>
          )}

          {tab === 'maths' && (
            <Maths eyeHeightM={eyeHeightM} cal={cal} night={night} onToggleNight={() => setNight((n) => !n)} />
          )}

          {silhouette && (
            <Silhouette
              profile={silhouette}
              headingRaw={orient.headingDeg}
              offset={azOffset}
              elevationDeg={orient.elevationDeg}
              cal={cal}
              onCommit={(v) => { setOffset(v); setSilhouette(null); }}
              onCancel={() => setSilhouette(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
