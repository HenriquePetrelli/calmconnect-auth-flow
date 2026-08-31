import { describe, it, expect } from 'vitest';
import { validateDayBlocks } from '@/lib/psychologistAvailability';

describe('validateDayBlocks', () => {
  it('accepts an empty day (not attending)', () => {
    expect(validateDayBlocks([])).toBeNull();
  });

  it('accepts a single valid block', () => {
    expect(validateDayBlocks([{ start_time: '08:00', end_time: '18:00' }])).toBeNull();
  });

  it('accepts two non-overlapping blocks (morning + afternoon)', () => {
    expect(
      validateDayBlocks([
        { start_time: '08:00', end_time: '12:00' },
        { start_time: '14:00', end_time: '18:00' },
      ])
    ).toBeNull();
  });

  it('rejects a block where start is not before end', () => {
    expect(validateDayBlocks([{ start_time: '12:00', end_time: '08:00' }])).toMatch(/início.*antes.*término/i);
    expect(validateDayBlocks([{ start_time: '10:00', end_time: '10:00' }])).toMatch(/início.*antes.*término/i);
  });

  it('rejects overlapping blocks regardless of input order', () => {
    expect(
      validateDayBlocks([
        { start_time: '08:00', end_time: '12:00' },
        { start_time: '11:00', end_time: '15:00' },
      ])
    ).toMatch(/sobrepostos/i);

    expect(
      validateDayBlocks([
        { start_time: '11:00', end_time: '15:00' },
        { start_time: '08:00', end_time: '12:00' },
      ])
    ).toMatch(/sobrepostos/i);
  });

  it('allows back-to-back blocks that touch but do not overlap', () => {
    expect(
      validateDayBlocks([
        { start_time: '08:00', end_time: '12:00' },
        { start_time: '12:00', end_time: '18:00' },
      ])
    ).toBeNull();
  });

  it('rejects a block with a missing time', () => {
    expect(validateDayBlocks([{ start_time: '', end_time: '18:00' }])).toMatch(/preencha/i);
  });
});
