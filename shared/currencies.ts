export const DEFAULT_ACADEMY_CURRENCY = 'USD';

export const SUPPORTED_CURRENCIES = [
  { name: 'US Dollar', code: 'USD', symbol: '$' },
  { name: 'Euro', code: 'EUR', symbol: '€' },
  { name: 'British Pound Sterling', code: 'GBP', symbol: '£' },
  { name: 'Israeli New Shekel', code: 'ILS', symbol: '₪' },
  { name: 'Japanese Yen', code: 'JPY', symbol: '¥' },
  { name: 'Chinese Yuan (Renminbi)', code: 'CNY', symbol: '¥' },
  { name: 'Canadian Dollar', code: 'CAD', symbol: 'C$' },
  { name: 'Australian Dollar', code: 'AUD', symbol: 'A$' },
  { name: 'Swiss Franc', code: 'CHF', symbol: 'CHF' },
  { name: 'Swedish Krona', code: 'SEK', symbol: 'kr' },
  { name: 'Norwegian Krone', code: 'NOK', symbol: 'kr' },
  { name: 'Danish Krone', code: 'DKK', symbol: 'kr' },
  { name: 'New Zealand Dollar', code: 'NZD', symbol: 'NZ$' },
  { name: 'Singapore Dollar', code: 'SGD', symbol: 'S$' },
  { name: 'Hong Kong Dollar', code: 'HKD', symbol: 'HK$' },
  { name: 'South Korean Won', code: 'KRW', symbol: '₩' },
  { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
  { name: 'Pakistani Rupee', code: 'PKR', symbol: '₨' },
  { name: 'Bangladeshi Taka', code: 'BDT', symbol: '৳' },
  { name: 'Sri Lankan Rupee', code: 'LKR', symbol: 'Rs' },
  { name: 'Nepalese Rupee', code: 'NPR', symbol: '₨' },
  { name: 'UAE Dirham', code: 'AED', symbol: 'د.إ' },
  { name: 'Saudi Riyal', code: 'SAR', symbol: '﷼' },
  { name: 'Qatari Riyal', code: 'QAR', symbol: 'ر.ق' },
  { name: 'Kuwaiti Dinar', code: 'KWD', symbol: 'د.ك' },
  { name: 'Bahraini Dinar', code: 'BHD', symbol: '.د.ب' },
  { name: 'Omani Rial', code: 'OMR', symbol: 'ر.ع.' },
  { name: 'Jordanian Dinar', code: 'JOD', symbol: 'د.ا' },
  { name: 'Egyptian Pound', code: 'EGP', symbol: 'E£' },
  { name: 'Moroccan Dirham', code: 'MAD', symbol: 'د.م.' },
  { name: 'Algerian Dinar', code: 'DZD', symbol: 'د.ج' },
  { name: 'Tunisian Dinar', code: 'TND', symbol: 'د.ت' },
  { name: 'Turkish Lira', code: 'TRY', symbol: '₺' },
  { name: 'Russian Ruble', code: 'RUB', symbol: '₽' },
  { name: 'Ukrainian Hryvnia', code: 'UAH', symbol: '₴' },
  { name: 'Polish Złoty', code: 'PLN', symbol: 'zł' },
  { name: 'Czech Koruna', code: 'CZK', symbol: 'Kč' },
  { name: 'Hungarian Forint', code: 'HUF', symbol: 'Ft' },
  { name: 'Romanian Leu', code: 'RON', symbol: 'lei' },
  { name: 'Bulgarian Lev', code: 'BGN', symbol: 'лв' },
  { name: 'Serbian Dinar', code: 'RSD', symbol: 'дин.' },
  { name: 'South African Rand', code: 'ZAR', symbol: 'R' },
  { name: 'Nigerian Naira', code: 'NGN', symbol: '₦' },
  { name: 'Kenyan Shilling', code: 'KES', symbol: 'KSh' },
  { name: 'Ethiopian Birr', code: 'ETB', symbol: 'Br' },
  { name: 'Ghanaian Cedi', code: 'GHS', symbol: 'GH₵' },
  { name: 'Mexican Peso', code: 'MXN', symbol: '$' },
  { name: 'Brazilian Real', code: 'BRL', symbol: 'R$' },
  { name: 'Argentine Peso', code: 'ARS', symbol: '$' },
  { name: 'Chilean Peso', code: 'CLP', symbol: '$' },
  { name: 'Colombian Peso', code: 'COP', symbol: '$' },
  { name: 'Peruvian Sol', code: 'PEN', symbol: 'S/' },
  { name: 'Uruguayan Peso', code: 'UYU', symbol: '$U' },
  { name: 'Dominican Peso', code: 'DOP', symbol: 'RD$' },
  { name: 'Thai Baht', code: 'THB', symbol: '฿' },
  { name: 'Vietnamese Dong', code: 'VND', symbol: '₫' },
  { name: 'Indonesian Rupiah', code: 'IDR', symbol: 'Rp' },
  { name: 'Malaysian Ringgit', code: 'MYR', symbol: 'RM' },
  { name: 'Philippine Peso', code: 'PHP', symbol: '₱' },
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

const currencyCodes = new Set<string>(SUPPORTED_CURRENCIES.map(({ code }) => code));

export function normalizeCurrencyCode(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

export function isSupportedCurrency(value: unknown): value is SupportedCurrencyCode {
  return currencyCodes.has(normalizeCurrencyCode(value));
}

export function formatMoney(
  amount: number | string,
  currency: string = DEFAULT_ACADEMY_CURRENCY,
  locale = 'en-US',
): string {
  const normalizedCurrency = normalizeCurrencyCode(currency) || DEFAULT_ACADEMY_CURRENCY;
  const numericAmount = Number(amount) || 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'narrowSymbol',
    }).format(numericAmount);
  } catch {
    return `${normalizedCurrency} ${numericAmount.toFixed(2)}`;
  }
}
