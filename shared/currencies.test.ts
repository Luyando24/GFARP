import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACADEMY_CURRENCY,
  SUPPORTED_CURRENCIES,
  formatMoney,
  isSupportedCurrency,
  normalizeCurrencyCode,
} from './currencies';

describe('academy currencies', () => {
  it('contains unique three-letter codes and keeps USD as the default', () => {
    const codes = SUPPORTED_CURRENCIES.map(({ code }) => code);

    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[A-Z]{3}$/.test(code))).toBe(true);
    expect(codes).toContain(DEFAULT_ACADEMY_CURRENCY);
  });

  it('normalizes and validates supported codes', () => {
    expect(normalizeCurrencyCode(' eur ')).toBe('EUR');
    expect(isSupportedCurrency(' eur ')).toBe(true);
    expect(isSupportedCurrency('ILS')).toBe(true);
    expect(isSupportedCurrency('ZMW')).toBe(false);
  });

  it('formats supported currencies without throwing', () => {
    expect(formatMoney(1250, 'NGN')).toContain('1,250');
    expect(formatMoney(1250, 'USD')).toContain('$');
    expect(formatMoney(1250, 'ILS')).toBeTruthy();
  });
});
