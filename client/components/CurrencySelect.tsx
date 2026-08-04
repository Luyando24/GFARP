import React from 'react';
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from '@shared/currencies';
import { cn } from '@/lib/utils';

interface CurrencySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function CurrencySelect({
  value,
  onValueChange,
  id,
  disabled,
  className,
  'aria-label': ariaLabel = 'Currency',
}: CurrencySelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900',
        className,
      )}
    >
      {!isSupportedCurrency(value) && value ? (
        <option value={value}>{value} — current legacy currency</option>
      ) : null}
      {SUPPORTED_CURRENCIES.map(({ code, name, symbol }) => (
        <option key={code} value={code}>
          {symbol} {code} — {name}
        </option>
      ))}
    </select>
  );
}

export default CurrencySelect;
