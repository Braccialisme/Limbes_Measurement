/**
 * Sélecteur d'objectif + zoom, flottant en haut à gauche. Ne s'affiche que
 * s'il y a un choix réel (plusieurs objectifs ou un zoom supporté).
 * Changer d'objectif/zoom change le FOV : la calibration suit la clef.
 */
export default function LensControl({ devices, deviceId, onSelect, zoom, onZoom }) {
  const multi = devices.length > 1;
  if (!multi && !zoom) return null;

  return (
    <div className="lens">
      {multi && (
        <div className="lens-grid">
          {devices.map((d, i) => (
            <button
              key={d.deviceId}
              className={`chip${d.deviceId === deviceId ? ' active' : ''}`}
              title={d.label || `objectif ${i + 1}`}
              onClick={() => onSelect(d.deviceId)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="lens-row">
          <button className="chip" onClick={() => onZoom(Math.max(zoom.min, zoom.value - zoom.step))}>−</button>
          <span className="lens-zoom">{zoom.value.toFixed(1)}×</span>
          <button className="chip" onClick={() => onZoom(Math.min(zoom.max, zoom.value + zoom.step))}>+</button>
        </div>
      )}
    </div>
  );
}
