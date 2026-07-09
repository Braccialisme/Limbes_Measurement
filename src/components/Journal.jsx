/** Carnet des mesures sauvegardées. Horodatage + détail, effaçable. */
function stamp(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toCsv(entries) {
  const rows = [['heure', 'type', 'détail'].join(';')];
  for (const e of entries) {
    const t = new Date(e.ts).toISOString();
    rows.push([t, e.label, e.detail].map((s) => `"${String(s).replace(/"/g, '""')}"`).join(';'));
  }
  return rows.join('\n');
}

export default function Journal({ entries, onRemove, onClear }) {
  const exportCsv = () => {
    const csv = toCsv(entries);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `limbe-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const share = async () => {
    try { await navigator.share({ title: 'Journal Limbe', text: toCsv(entries) }); }
    catch { /* annulé ou non supporté */ }
  };

  return (
    <div className="panel journal">
      <div className="panel-title">Journal — {entries.length} mesure{entries.length > 1 ? 's' : ''}</div>
      {entries.length === 0 ? (
        <p className="hint">Aucune mesure. Journalise depuis Visée ou Civil.</p>
      ) : (
        <ul className="journal-list">
          {entries.map((e) => (
            <li key={e.id} className="journal-item">
              <span className="journal-time">{stamp(e.ts)}</span>
              <span className="journal-body">
                <span className="journal-label">{e.label}</span>
                <span className="journal-detail">{e.detail}</span>
              </span>
              <button className="chip" onClick={() => onRemove(e.id)}>×</button>
            </li>
          ))}
        </ul>
      )}
      {entries.length > 0 && (
        <div className="row measure">
          <button className="btn" onClick={exportCsv}>Exporter CSV</button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button className="btn" onClick={share}>Partager</button>
          )}
          <button className="btn ghost" onClick={onClear}>Tout effacer</button>
        </div>
      )}
    </div>
  );
}
