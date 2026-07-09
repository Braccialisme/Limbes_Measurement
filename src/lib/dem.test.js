import { describe, it, expect } from 'vitest';
import {
  decodeTerrarium,
  lngLatToGlobalPixel,
  tileFor,
  rayMarchTerrain,
} from './dem.js';

describe('terrarium', () => {
  it('0 m = (128,0,0)', () => {
    expect(decodeTerrarium(128, 0, 0)).toBe(0);
  });
  it('+10 m', () => {
    expect(decodeTerrarium(128, 10, 0)).toBe(10);
  });
  it('sous le niveau de la mer (−5 m)', () => {
    // 32763 = 127*256 + 251  → 127*256+251-32768 = -5
    expect(decodeTerrarium(127, 251, 0)).toBeCloseTo(-5, 6);
  });
});

describe('tuiles slippy', () => {
  it('lon/lat 0 au zoom 0 → centre de la tuile (128,128)', () => {
    const p = lngLatToGlobalPixel(0, 0, 0);
    expect(p.x).toBeCloseTo(128, 6);
    expect(p.y).toBeCloseTo(128, 6);
  });
  it('tuile de Paris au zoom 12', () => {
    const t = tileFor(48.8566, 2.3522, 12);
    expect(t).toEqual({ z: 12, x: 2074, y: 1409 });
  });
});

describe('ray-march', () => {
  it('sol plat à 0, œil à 100 m, visée −5° → touche ~1.1 km', () => {
    const hit = rayMarchTerrain({
      latDeg: 45, lonDeg: 5, observerAltM: 100,
      azimuthDeg: 90, elevationDeg: -5,
      sample: () => 0, maxDistanceM: 5000, stepM: 10,
    });
    expect(hit).not.toBeNull();
    // 100 = d·tan(5°) − courbure → d un peu au-delà de 1143 m
    expect(hit.distanceM).toBeGreaterThan(1100);
    expect(hit.distanceM).toBeLessThan(1250);
    expect(hit.altM).toBeCloseTo(0, 0);
  });

  it('mur à 50 m qui monte à 500 m, visée horizontale → touche ~500 m', () => {
    const hit = rayMarchTerrain({
      latDeg: 45, lonDeg: 5, observerAltM: 0,
      azimuthDeg: 0, elevationDeg: 0,
      sample: (lat) => (lat >= 45 + 500 / 111320 ? 50 : 0), // sol monte vers le nord
      maxDistanceM: 2000, stepM: 5,
    });
    expect(hit).not.toBeNull();
    expect(hit.distanceM).toBeGreaterThan(480);
    expect(hit.distanceM).toBeLessThan(560);
  });

  it('rien dans la portée → null', () => {
    const hit = rayMarchTerrain({
      latDeg: 45, lonDeg: 5, observerAltM: 2,
      azimuthDeg: 0, elevationDeg: 10, // vise le ciel
      sample: () => 0, maxDistanceM: 3000, stepM: 25,
    });
    expect(hit).toBeNull();
  });

  it('hors couverture DEM → null', () => {
    const hit = rayMarchTerrain({
      latDeg: 45, lonDeg: 5, observerAltM: 100,
      azimuthDeg: 90, elevationDeg: -5,
      sample: () => null, maxDistanceM: 5000, stepM: 25,
    });
    expect(hit).toBeNull();
  });
});
