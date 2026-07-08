import { useState, useCallback } from 'react';

/**
 * Journal des mesures, persisté en localStorage. Chaque entrée :
 * { id, ts, kind, label, detail }. Sans physique — un simple carnet.
 */
const KEY = 'limbe.journal.v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

export function useJournal() {
  const [entries, setEntries] = useState(load);

  const persist = (next) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
  };

  const add = useCallback((entry) => {
    setEntries((prev) => {
      const next = [{ id: Date.now(), ts: Date.now(), ...entry }, ...prev].slice(0, 200);
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((id) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => { setEntries([]); persist([]); }, []);

  return { entries, add, remove, clear };
}
