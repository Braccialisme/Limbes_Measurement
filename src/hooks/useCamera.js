import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Flux caméra arrière + choix d'objectif + zoom. HTTPS obligatoire.
 * - `devices` : objectifs arrière énumérés (labels dispo après permission).
 *   Android expose souvent ultra-grand-angle / grand-angle / télé comme
 *   devices distincts ; iOS souvent un seul device logique.
 * - `zoom` : capacités de zoom du track si supportées (surtout Android).
 * Chaque objectif/zoom change le FOV → la calibration est clefée dessus.
 */
export function useCamera(enabled) {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [zoom, setZoom] = useState(null); // { min, max, step, value } | null

  useEffect(() => {
    if (!enabled) return;
    let stream;
    (async () => {
      try {
        const video = deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 } }
          : { facingMode: 'environment', width: { ideal: 1920 } };
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        if (videoRef.current) videoRef.current.srcObject = stream;

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        const caps = track.getCapabilities?.() || {};
        const settings = track.getSettings?.() || {};
        setZoom(
          caps.zoom
            ? { min: caps.zoom.min, max: caps.zoom.max,
                step: caps.zoom.step || 0.1, value: settings.zoom ?? caps.zoom.min }
            : null
        );

        const list = await navigator.mediaDevices.enumerateDevices();
        setDevices(list.filter((d) => d.kind === 'videoinput'));
        if (!deviceId && settings.deviceId) setDeviceId(settings.deviceId);
      } catch (e) {
        setError(e.message);
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [enabled, deviceId]);

  const selectDevice = useCallback((id) => setDeviceId(id), []);

  const applyZoom = useCallback((v) => {
    const track = trackRef.current;
    if (!track) return;
    track
      .applyConstraints({ advanced: [{ zoom: v }] })
      .then(() => setZoom((z) => (z ? { ...z, value: v } : z)))
      .catch(() => { /* non supporté */ });
  }, []);

  // Clef d'objectif pour la calibration : device + zoom courant.
  const lensKey = `${deviceId || 'default'}@z${zoom ? zoom.value.toFixed(1) : '1'}`;

  return { videoRef, error, devices, deviceId, selectDevice, zoom, setZoom: applyZoom, lensKey };
}
