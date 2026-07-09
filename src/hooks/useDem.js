import { useRef, useState, useCallback } from 'react';
import { decodeTerrarium, lngLatToGlobalPixel, tileFor } from '../lib/dem.js';

/**
 * Chargement du MNT (tuiles terrarium AWS Terrain Tiles, SRTM/Copernicus).
 * Télécharge une bbox autour d'une position, décode les PNG en grilles
 * d'altitude, met en cache (Cache API → offline), et expose un
 * `sample(lat, lon)` synchrone pour le ray-march. Le DEM ne s'affiche
 * JAMAIS : lookup silencieux.
 */
const Z = 12;              // ~30 m/px, largement assez
const TS = 256;
const CACHE = 'limbe-dem-v1';
const TILE_URL = (z, x, y) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

async function cachedFetch(url) {
  try {
    const cache = await caches.open(CACHE);
    let res = await cache.match(url);
    if (!res) {
      res = await fetch(url, { mode: 'cors' });
      if (res.ok) cache.put(url, res.clone());
    }
    return res;
  } catch {
    return fetch(url, { mode: 'cors' }); // pas de Cache API : direct
  }
}

async function fetchTile(z, x, y) {
  const res = await cachedFetch(TILE_URL(z, x, y));
  if (!res.ok) throw new Error(`tuile ${z}/${x}/${y} : ${res.status}`);
  const bmp = await createImageBitmap(await res.blob());
  let ctx;
  if (typeof OffscreenCanvas !== 'undefined') {
    ctx = new OffscreenCanvas(TS, TS).getContext('2d');
  } else {
    const c = document.createElement('canvas');
    c.width = TS; c.height = TS;
    ctx = c.getContext('2d');
  }
  ctx.drawImage(bmp, 0, 0);
  return ctx.getImageData(0, 0, TS, TS);
}

export function useDem() {
  const tiles = useRef(new Map());  // "z/x/y" → ImageData
  const [status, setStatus] = useState({ ready: false, loading: false, progress: 0, error: null });

  const sample = useCallback((latDeg, lonDeg) => {
    const p = lngLatToGlobalPixel(latDeg, lonDeg, Z, TS);
    const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
    const img = tiles.current.get(`${Z}/${tx}/${ty}`);
    if (!img) return null;
    const px = Math.min(TS - 1, Math.floor(p.x) - tx * TS);
    const py = Math.min(TS - 1, Math.floor(p.y) - ty * TS);
    const i = (py * TS + px) * 4;
    return decodeTerrarium(img.data[i], img.data[i + 1], img.data[i + 2]);
  }, []);

  /** Télécharge les tuiles couvrant une bbox de ±halfDeg autour de (lat,lon). */
  const downloadRegion = useCallback(async (latDeg, lonDeg, halfDeg = 0.1) => {
    setStatus({ ready: false, loading: true, progress: 0, error: null });
    const a = tileFor(latDeg + halfDeg, lonDeg - halfDeg, Z); // coin NO
    const b = tileFor(latDeg - halfDeg, lonDeg + halfDeg, Z); // coin SE
    const xs = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
    const ys = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
    const jobs = [];
    for (let x = xs[0]; x <= xs[1]; x++)
      for (let y = ys[0]; y <= ys[1]; y++) jobs.push({ x, y });

    let done = 0;
    try {
      for (const { x, y } of jobs) {
        const key = `${Z}/${x}/${y}`;
        if (!tiles.current.has(key)) tiles.current.set(key, await fetchTile(Z, x, y));
        done++;
        setStatus({ ready: false, loading: true, progress: Math.round((done / jobs.length) * 100), error: null });
      }
      setStatus({ ready: true, loading: false, progress: 100, error: null });
      return true;
    } catch (e) {
      setStatus({ ready: false, loading: false, progress: 0, error: e.message });
      return false;
    }
  }, []);

  return { sample, downloadRegion, ...status };
}
