import { describe, it, expect } from 'vitest';
import { STARS, starSeparationDeg } from './stars.js';

const byName = (n) => STARS.find((s) => s.name === n);

describe('étoiles', () => {
  it('séparation avec soi-même = 0', () => {
    expect(starSeparationDeg(byName('Sirius'), byName('Sirius'))).toBeCloseTo(0, 4);
  });
  it('Bételgeuse–Rigel ≈ 18.6°', () => {
    expect(starSeparationDeg(byName('Bételgeuse'), byName('Rigel'))).toBeCloseTo(18.61, 1);
  });
  it('Bételgeuse–Sirius ≈ 27.1°', () => {
    expect(starSeparationDeg(byName('Bételgeuse'), byName('Sirius'))).toBeCloseTo(27.10, 1);
  });
  it('symétrique', () => {
    const a = byName('Véga'), b = byName('Altaïr');
    expect(starSeparationDeg(a, b)).toBeCloseTo(starSeparationDeg(b, a), 9);
  });
});
