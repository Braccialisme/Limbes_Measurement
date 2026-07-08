import { describe, it, expect } from 'vitest';
import {
  horizonDistanceKm,
  horizonDipDeg,
  eyeHeightFromDipDeg,
  hiddenHeightM,
  seaObjectEstimate,
  angularSizeToPhysicalM,
  angularWidthDeg,
  degPerScreenPx,
  spanToAngleDeg,
  physicalSizeToDistanceM,
  heightFromElevationsM,
  angularSeparationDeg,
  formatDMS,
  destinationPoint,
  degPerPixel,
} from './geometry.js';

describe('horizon', () => {
  it('œil à 1.6 m sur la plage → horizon ≈ 4.9 km', () => {
    expect(horizonDistanceKm(1.6)).toBeCloseTo(4.88, 1);
  });
  it('dune à 10 m → ≈ 12.2 km', () => {
    expect(horizonDistanceKm(10)).toBeCloseTo(12.2, 0);
  });
  it('dip à 1.6 m ≈ 0.04°', () => {
    expect(horizonDipDeg(1.6)).toBeCloseTo(0.0382, 2);
  });
  it('10 km derrière l’horizon → ~6.8 m cachés', () => {
    expect(hiddenHeightM(10)).toBeCloseTo(6.8, 0);
  });
  it('dip ↔ hauteur : aller-retour cohérent (falaise 50 m)', () => {
    const dip = horizonDipDeg(50);
    expect(eyeHeightFromDipDeg(dip)).toBeCloseTo(50, 6);
  });
  it('dip mesuré 0.30° → hauteur d’œil ≈ 100 m', () => {
    expect(eyeHeightFromDipDeg(0.30)).toBeCloseTo(100.4, 0);
  });
});

describe('cas plage', () => {
  it('flottaison visible → borne max', () => {
    const r = seaObjectEstimate({ eyeHeightM: 1.6, angularWidthDeg: 1, waterlineVisible: true });
    expect(r.kind).toBe('within-horizon');
    expect(r.maxSizeM).toBeCloseTo(84.5, 0); // 1° à ~4.84 km ≈ 84.5 m
  });
  it('coque tranchée → plancher de taille', () => {
    const r = seaObjectEstimate({ eyeHeightM: 1.6, angularWidthDeg: 2, waterlineVisible: false });
    expect(r.kind).toBe('beyond-horizon');
    expect(r.minSizeM).toBeGreaterThan(150); // déjà trop gros pour un chalutier
  });
});

describe('angles ↔ tailles', () => {
  it('la Lune : 0.52° à 384 400 km ≈ 3 490 km', () => {
    expect(angularSizeToPhysicalM(0.52, 384_400_000) / 1000).toBeCloseTo(3489, 0);
  });
  it('aller-retour cohérent', () => {
    const d = physicalSizeToDistanceM(18, 0.245);
    expect(angularSizeToPhysicalM(0.245, d)).toBeCloseTo(18, 6);
  });
  it('largeur angulaire : porte 2 m à 14.3 m ≈ 8°', () => {
    expect(angularWidthDeg(2, 14.3)).toBeCloseTo(8.0, 1);
  });
  it('calibration écran ↔ mesure : aller-retour', () => {
    const ang = angularWidthDeg(2, 14.3);      // ~8°
    const scale = degPerScreenPx(ang, 240);    // objet sur 240 px
    expect(spanToAngleDeg(240, scale)).toBeCloseTo(ang, 6);
    expect(spanToAngleDeg(120, scale)).toBeCloseTo(ang / 2, 6);
  });
  it('château : 4200 m, base 1.0°, sommet 1.245° → ≈ 18 m', () => {
    expect(heightFromElevationsM(4200, 1.0, 1.245)).toBeCloseTo(18, 0);
  });
});

describe('séparation angulaire', () => {
  it('même élévation, 90° d’écart d’azimut, à l’horizon → 90°', () => {
    const a = { azimuthDeg: 0, elevationDeg: 0 };
    const b = { azimuthDeg: 90, elevationDeg: 0 };
    expect(angularSeparationDeg(a, b)).toBeCloseTo(90, 6);
  });
  it('zénith commun : écart d’azimut sans effet', () => {
    const a = { azimuthDeg: 0, elevationDeg: 90 };
    const b = { azimuthDeg: 123, elevationDeg: 90 };
    expect(angularSeparationDeg(a, b)).toBeCloseTo(0, 6);
  });
});

describe('formats & géodésie', () => {
  it('DMS', () => {
    expect(formatDMS(1.5375)).toBe('1° 32′ 15″');
  });
  it('destinationPoint : 111.2 km plein nord ≈ +1° de latitude', () => {
    const p = destinationPoint(45, 5, 0, 111_195);
    expect(p.latDeg).toBeCloseTo(46, 2);
    expect(p.lonDeg).toBeCloseTo(5, 4);
  });
  it('plate scale : 70° de HFOV sur 1920 px ≈ 0.028°/px au centre', () => {
    expect(degPerPixel(70, 1920)).toBeCloseTo(0.0418 * 0.7, 1);
  });
});
