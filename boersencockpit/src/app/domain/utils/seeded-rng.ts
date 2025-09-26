export type SeededRng = () => number;

export const createSeededRng = (seed: number): SeededRng => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
};

export const createRandomWalk = (
  base: number,
  rng: SeededRng,
  step = 0.5
): (() => number) => {
  let current = base;
  return () => {
    const delta = (rng() - 0.5) * step;
    current = Math.max(0, current * (1 + delta / 100));
    return current;
  };
};
