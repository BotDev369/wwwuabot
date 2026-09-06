import { describe, it, expect } from 'vitest';
import { getZodiacSign } from './DateCardBlock';

describe('getZodiacSign', () => {
  // Регресійний тест на баг, знайдений при тестуванні сторінки:
  // 15.05.2000 показувало "Овен" замість "Телець".
  it('returns Телець for 15 травня (регресія знайденого бага)', () => {
    expect(getZodiacSign(5, 15).name).toBe('Телець');
  });

  it('handles the cutoff day itself as the previous sign', () => {
    expect(getZodiacSign(3, 20).name).toBe('Риби');
    expect(getZodiacSign(4, 20).name).toBe('Овен');
  });

  it('handles the day right after the cutoff as the new sign', () => {
    expect(getZodiacSign(3, 21).name).toBe('Овен');
    expect(getZodiacSign(4, 21).name).toBe('Телець');
  });

  it('handles January (still Козеріг before the cutoff)', () => {
    expect(getZodiacSign(1, 1).name).toBe('Козеріг');
    expect(getZodiacSign(1, 20).name).toBe('Козеріг');
    expect(getZodiacSign(1, 21).name).toBe('Водолій');
  });

  it('handles December without going out of bounds', () => {
    expect(getZodiacSign(12, 20).name).toBe('Стрілець');
    expect(getZodiacSign(12, 22).name).toBe('Козеріг');
    expect(getZodiacSign(12, 31).name).toBe('Козеріг');
  });
});
