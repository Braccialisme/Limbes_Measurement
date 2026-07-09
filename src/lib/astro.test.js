import { describe, it, expect } from 'vitest';
import {
  dayNumber, sunEquatorial, moonEquatorial, skyPositions,
  moonPhase, riseSetTransit,
} from './astro.js';

describe('Soleil', () => {
  it('déclinaison ≈ 0 à l’équinoxe de mars', () => {
    const d = dayNumber(new Date(Date.UTC(2000, 2, 20, 7, 35))); // équinoxe 2000
    expect(sunEquatorial(d).dec).toBeCloseTo(0, 0); // < 0.5°
  });
  it('déclinaison ≈ +23.4° au solstice de juin', () => {
    const d = dayNumber(new Date(Date.UTC(2000, 5, 21)));
    expect(sunEquatorial(d).dec).toBeGreaterThan(23.0);
    expect(sunEquatorial(d).dec).toBeLessThan(23.6);
  });
  it('déclinaison ≈ −23.4° au solstice de décembre', () => {
    const d = dayNumber(new Date(Date.UTC(2000, 11, 21)));
    expect(sunEquatorial(d).dec).toBeLessThan(-23.0);
  });
  it('diamètre apparent ≈ 0.53°', () => {
    const d = dayNumber(new Date(Date.UTC(2024, 0, 3))); // périhélie : un peu plus gros
    expect(sunEquatorial(d).diamDeg).toBeGreaterThan(0.52);
    expect(sunEquatorial(d).diamDeg).toBeLessThan(0.55);
  });
});

describe('Lune', () => {
  it('distance dans la plage périgée-apogée', () => {
    const d = dayNumber(new Date(Date.UTC(2024, 5, 1)));
    const sun = sunEquatorial(d);
    const m = moonEquatorial(d, sun);
    expect(m.distanceKm).toBeGreaterThan(355000);
    expect(m.distanceKm).toBeLessThan(407000);
  });
  it('diamètre apparent ≈ 0.5° (0.48–0.57)', () => {
    const d = dayNumber(new Date(Date.UTC(2024, 5, 1)));
    const m = moonEquatorial(d, sunEquatorial(d));
    expect(m.diamDeg).toBeGreaterThan(0.48);
    expect(m.diamDeg).toBeLessThan(0.57);
  });
});

describe('almanach', () => {
  it('nouvelle lune (2024-01-11) → fraction éclairée ~0', () => {
    const { illum } = moonPhase(new Date(Date.UTC(2024, 0, 11, 12, 0)));
    expect(illum).toBeLessThan(0.06);
  });
  it('pleine lune (2024-01-25) → fraction éclairée ~1', () => {
    const { illum } = moonPhase(new Date(Date.UTC(2024, 0, 25, 18, 0)));
    expect(illum).toBeGreaterThan(0.94);
  });
  it('Soleil : lever avant coucher, culmination haute (Paris, été)', () => {
    const r = riseSetTransit('sun', new Date(Date.UTC(2024, 5, 21)), 48.85, 2.35);
    expect(r.rise).not.toBeNull();
    expect(r.set).not.toBeNull();
    expect(r.rise.getTime()).toBeLessThan(r.set.getTime());
    expect(r.maxAltDeg).toBeGreaterThan(60);
  });
});

describe('horizontal', () => {
  it('Soleil sous l’horizon à minuit local (Paris, hiver)', () => {
    // ~00:00 UTC = ~01:00 locale à Paris en hiver : le Soleil est bas/négatif
    const { sun } = skyPositions(new Date(Date.UTC(2024, 0, 15, 0, 0)), 48.85, 2.35);
    expect(sun.altDeg).toBeLessThan(0);
  });
  it('Soleil haut à midi UTC (Paris) et azimut au sud', () => {
    const { sun } = skyPositions(new Date(Date.UTC(2024, 5, 21, 12, 0)), 48.85, 2.35);
    expect(sun.altDeg).toBeGreaterThan(50);      // solstice d'été, midi
    expect(sun.azDeg).toBeGreaterThan(150);
    expect(sun.azDeg).toBeLessThan(210);         // plein sud ± 30°
  });
});
