import { useState, useCallback } from 'react';
import { useOrientation } from './hooks/useOrientation.js';
import { useGeolocation } from './hooks/useGeolocation.js';
import { useCamera } from './hooks/useCamera.js';
import { useCalibration } from './hooks/useCalibration.js';
import { angularSeparationDeg } from './lib/geometry.js';
import Reticle from './components/Reticle.jsx';
import Readout from './components/Readout.jsx';
import Calibration from './components/Calibration.jsx';

export default function App() {
  const orient = useOrientation();
  const [started, setStarted] = useState(false);
  const { fix, error: gpsError } = useGeolocation(started);
  const { videoRef, error: camError } = useCamera(started);

  const { cal, save: saveCal } = useCalibration();
  const [overlay, setOverlay] = useState(null); // null | 'calibration'
  const [eyeHeightM, setEyeHeightM] = useState(1.6);
  const [markA, setMarkA] = useState(null);
  const [markB, setMarkB] = useState(null);

  const start = useCallback(async () => {
    const ok = await orient.requestAccess();
    if (ok) setStarted(true);
  }, [orient]);

  const mark = useCallback(() => {
    if (orient.elevationDeg == null) return;
    const sight = {
      elevationDeg: orient.elevationDeg,
      azimuthDeg: orient.headingDeg ?? 0,
    };
    if (!markA) setMarkA(sight);
    else if (!markB) setMarkB(sight);
    else { setMarkA(sight); setMarkB(null); }
  }, [orient.elevationDeg, orient.headingDeg, markA, markB]);

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
      </div>
    );
  }

  const calibrating = overlay === 'calibration';

  return (
    <div className="instrument">
      <video ref={videoRef} autoPlay playsInline muted className="liveview" />
      {camError && <div className="cam-error">caméra : {camError}</div>}

      {calibrating ? (
        <Calibration
          current={cal}
          onSave={(c) => { saveCal(c); setOverlay(null); }}
          onCancel={() => setOverlay(null)}
        />
      ) : (
        <>
          <button className="btn ghost topbtn" onClick={() => setOverlay('calibration')}>
            FOV
          </button>
          <Reticle
            elevationDeg={orient.elevationDeg}
            rollDeg={orient.rollDeg}
            markA={markA}
            markB={markB}
          />
          <Readout
            elevationDeg={orient.elevationDeg}
            rollDeg={orient.rollDeg}
            headingDeg={orient.headingDeg}
            headingSource={orient.headingSource}
            fix={fix}
            gpsError={gpsError}
            cal={cal}
            eyeHeightM={eyeHeightM}
            onEyeHeight={setEyeHeightM}
            markA={markA}
            markB={markB}
            separationDeg={separationDeg}
            onMark={mark}
            onClearMarks={clearMarks}
          />
        </>
      )}
    </div>
  );
}
