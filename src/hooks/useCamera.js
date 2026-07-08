import { useState, useEffect, useRef } from 'react';

/** Flux caméra arrière dans une ref <video>. HTTPS obligatoire. */
export function useCamera(enabled) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 } },
          audio: false,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        setError(e.message);
      }
    })();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [enabled]);
  return { videoRef, error };
}
