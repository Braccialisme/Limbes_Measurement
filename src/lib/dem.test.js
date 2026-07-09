import { describe, it, expect } from 'vitest';
import {
  decodeTerrarium,
  lngLatToGlobalPixel,
  tileFor,
  rayMarchTerrain,
  apparentElevationDeg,
  crestProfile,
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

describe('silhouette / crête', () => {
  it('élévation apparente : +100 m à 1 km ≈ 5.7°', () => {
    expect(apparentElevationDeg(200, 100, 1000)).toBeCloseTo(5.71, 1);
  });
  it('même altitude : légèrement négatif (dip de courbure)', () => {
    expect(apparentElevationDeg(100, 100, 1000)).toBeLessThan(0);
  });
  it('profil de crête : colline au nord domine le sud', () => {
    const lat0 = 45, lon0 = 5;
    const sample = (lat) => (lat > lat0 ? 500 : 0); // relief au nord
    const prof = crestProfile({
      latDeg: lat0, lonDeg: lon0, observerAltM: 0, sample,
      azStepDeg: 10, maxDistanceM: 8000, stepM: 100,
    });
    expect(prof).toHaveLength(36);
    const at = (a) => prof.find((p) => p.azDeg === a).elevDeg;
    expect(at(0)).toBeGreaterThan(1);       // nord : crête haute
    expect(at(0)).toBeGreaterThan(at(180)); // > sud (plat)
  });
});
