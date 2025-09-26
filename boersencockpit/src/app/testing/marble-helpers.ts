import { RunHelpers, TestScheduler } from 'rxjs/testing';

export type MarbleAssert = (helpers: RunHelpers) => void;

export const createTestScheduler = (): TestScheduler =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

export const runMarbles = (assertFn: MarbleAssert): void => {
  const scheduler = createTestScheduler();
  scheduler.run(assertFn);
};
