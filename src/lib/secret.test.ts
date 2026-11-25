import { describe, expect, it } from 'vitest';
import { safeEqual } from './secret';

describe('safeEqual', () => {
  it('matches identical strings and rejects different lengths or contents', () => {
    expect(safeEqual('cron-secret', 'cron-secret')).toBe(true);
    expect(safeEqual('cron-secret', 'cron-secreT')).toBe(false);
    expect(safeEqual('short', 'longer-value')).toBe(false);
  });
});
