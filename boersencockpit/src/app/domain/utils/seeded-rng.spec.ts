import { createSeededRng, createRandomWalk } from './seeded-rng';

describe('seeded-rng', () => {
  it('produces deterministic sequence', () => {
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(42);
    expect(Array.from({ length: 5 }, () => rng1())).toEqual(
      Array.from({ length: 5 }, () => rng2())
    );
  });

  it('creates random walk bounded at zero', () => {
    const rng = () => 0; // always negative delta
    const walk = createRandomWalk(10, rng, 1);
    expect(walk()).toBeCloseTo(9.95);
  });
});
