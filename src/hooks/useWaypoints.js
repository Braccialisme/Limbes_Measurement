import { useState, useCallback } from 'react';

/** Points GPS mémorisés (pélorus), persistés en localStorage. */
const KEY = 'limbe.waypoints.v1';
const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};

export function useWaypoints() {
  const [list, setList] = useState(load);
  const persist = (n) => { try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* quota */ } };

  const add = useCallback((wp) => {
    setList((prev) => {
      const n = [{ id: Date.now(), ts: Date.now(), ...wp }, ...prev].slice(0, 100);
      persist(n); return n;
    });
  }, []);
  const remove = useCallback((id) => {
    setList((prev) => { const n = prev.filter((w) => w.id !== id); persist(n); return n; });
  }, []);

  return { list, add, remove };
}
