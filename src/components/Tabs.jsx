/** Barre d'onglets : Visée / Terre / Mer / Civil / Journal / Maths. */
const TABS = [
  ['sight', 'Visée'],
  ['terre', 'Terre'],
  ['mer', 'Mer'],
  ['civil', 'Civil'],
  ['journal', 'Journal'],
  ['maths', 'Maths'],
];

export default function Tabs({ tab, onTab }) {
  return (
    <div className="tabs">
      {TABS.map(([k, label]) => (
        <button
          key={k}
          className={`tab${tab === k ? ' active' : ''}`}
          onClick={() => onTab(k)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
