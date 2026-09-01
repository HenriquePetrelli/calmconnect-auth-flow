import { describe, it, expect } from 'vitest';
import { applyOverridesToDayBlocks } from '@/lib/psychologistAvailability';

const base = [{ start_time: '08:00', end_time: '18:00' }];

describe('applyOverridesToDayBlocks', () => {
  it('sem exceções, retorna o horário-padrão inalterado', () => {
    expect(applyOverridesToDayBlocks(base, [])).toEqual(base);
  });

  it('bloqueio cobrindo o bloco inteiro remove tudo', () => {
    const result = applyOverridesToDayBlocks(base, [
      { start_time: '08:00', end_time: '18:00', type: 'bloqueio' },
    ]);
    expect(result).toEqual([]);
  });

  it('bloqueio cobrindo mais que o bloco também remove tudo', () => {
    const result = applyOverridesToDayBlocks(base, [
      { start_time: '07:00', end_time: '19:00', type: 'bloqueio' },
    ]);
    expect(result).toEqual([]);
  });

  it('bloqueio no início trunca o começo do bloco', () => {
    const result = applyOverridesToDayBlocks(base, [
      { start_time: '08:00', end_time: '10:00', type: 'bloqueio' },
    ]);
    expect(result).toEqual([{ start_time: '10:00', end_time: '18:00' }]);
  });

  it('bloqueio no fim trunca o final do bloco', () => {
    const result = applyOverridesToDayBlocks(base, [
      { start_time: '16:00', end_time: '18:00', type: 'bloqueio' },
    ]);
    expect(result).toEqual([{ start_time: '08:00', end_time: '16:00' }]);
  });

  it('bloqueio no meio divide o bloco em dois', () => {
    const result = applyOverridesToDayBlocks(base, [
      { start_time: '12:00', end_time: '13:00', type: 'bloqueio' },
    ]);
    expect(result).toEqual([
      { start_time: '08:00', end_time: '12:00' },
      { start_time: '13:00', end_time: '18:00' },
    ]);
  });

  it('bloqueio sem sobreposição não altera nada', () => {
    const result = applyOverridesToDayBlocks(base, [
      { start_time: '19:00', end_time: '20:00', type: 'bloqueio' },
    ]);
    expect(result).toEqual(base);
  });

  it('múltiplos bloqueios se acumulam corretamente', () => {
    const result = applyOverridesToDayBlocks(base, [
      { start_time: '10:00', end_time: '11:00', type: 'bloqueio' },
      { start_time: '15:00', end_time: '16:00', type: 'bloqueio' },
    ]);
    expect(result).toEqual([
      { start_time: '08:00', end_time: '10:00' },
      { start_time: '11:00', end_time: '15:00' },
      { start_time: '16:00', end_time: '18:00' },
    ]);
  });

  it('bloqueio que abrange dois blocos separados afeta os dois', () => {
    const twoBlocks = [
      { start_time: '08:00', end_time: '12:00' },
      { start_time: '14:00', end_time: '18:00' },
    ];
    const result = applyOverridesToDayBlocks(twoBlocks, [
      { start_time: '11:00', end_time: '15:00', type: 'bloqueio' },
    ]);
    expect(result).toEqual([
      { start_time: '08:00', end_time: '11:00' },
      { start_time: '15:00', end_time: '18:00' },
    ]);
  });

  it('abertura adiciona uma faixa extra em um dia sem horário-padrão', () => {
    const result = applyOverridesToDayBlocks([], [
      { start_time: '09:00', end_time: '10:00', type: 'abertura' },
    ]);
    expect(result).toEqual([{ start_time: '09:00', end_time: '10:00' }]);
  });

  it('abertura soma ao horário-padrão existente, ordenado por início', () => {
    const result = applyOverridesToDayBlocks(base, [
      { start_time: '19:00', end_time: '20:00', type: 'abertura' },
    ]);
    expect(result).toEqual([
      { start_time: '08:00', end_time: '18:00' },
      { start_time: '19:00', end_time: '20:00' },
    ]);
  });

  it('bloqueio não corta uma abertura da mesma data (edição direta é o caminho para isso)', () => {
    const result = applyOverridesToDayBlocks([], [
      { start_time: '19:00', end_time: '21:00', type: 'abertura' },
      { start_time: '19:30', end_time: '20:00', type: 'bloqueio' },
    ]);
    expect(result).toEqual([{ start_time: '19:00', end_time: '21:00' }]);
  });

  it('combina bloqueio no padrão e abertura extra no mesmo dia', () => {
    const result = applyOverridesToDayBlocks(base, [
      { start_time: '12:00', end_time: '13:00', type: 'bloqueio' },
      { start_time: '19:00', end_time: '20:00', type: 'abertura' },
    ]);
    expect(result).toEqual([
      { start_time: '08:00', end_time: '12:00' },
      { start_time: '13:00', end_time: '18:00' },
      { start_time: '19:00', end_time: '20:00' },
    ]);
  });
});
