import { useState, useEffect } from 'react';

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'BTC' | 'ETH' | 'JPY' | 'CNY' | 'CAD' | 'AUD' | 'CHF' | 'MXN' | 'BRL' | 'INR' | 'KRW' | 'RUB';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'BTC', symbol: '₿', name: 'Bitcoin' },
  { code: 'ETH', symbol: 'Ξ', name: 'Ethereum' },
];

// Exchange rates (simplified, for display purposes only)
// In production, you might want to fetch these from an API
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  EUR: 1.0,
  USD: 1.1,
  GBP: 0.85,
  JPY: 165.0,
  CNY: 7.8,
  CAD: 1.5,
  AUD: 1.65,
  CHF: 0.95,
  MXN: 18.5,
  BRL: 5.4,
  INR: 91.5,
  KRW: 1450.0,
  RUB: 100.0,
  BTC: 0.000015, // Approximate, highly volatile
  ETH: 0.0003, // Approximate, highly volatile
};

const CURRENCY_STORAGE_KEY = 'user_preferred_currency';

export const useCurrency = () => {
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');

  // Load currency from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null;
    if (savedCurrency && CURRENCIES.find(c => c.code === savedCurrency)) {
      setCurrency(savedCurrency);
    }
  }, []);

  // Save currency to localStorage when it changes
  const changeCurrency = (newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
  };

  const getCurrencySymbol = (): string => {
    const currencyObj = CURRENCIES.find(c => c.code === currency);
    return currencyObj?.symbol || '€';
  };

  const getCurrencyName = (): string => {
    const currencyObj = CURRENCIES.find(c => c.code === currency);
    return currencyObj?.name || 'Euro';
  };

  const convertPrice = (priceEUR: number): number => {
    const rate = EXCHANGE_RATES[currency] || 1.0;
    // For cryptocurrencies, show more decimal places
    if (currency === 'BTC' || currency === 'ETH') {
      return parseFloat((priceEUR * rate).toFixed(8));
    }
    // For regular currencies, round to 2 decimal places
    return Math.round(priceEUR * rate * 100) / 100;
  };

  const formatPrice = (priceEUR: number): string => {
    const converted = convertPrice(priceEUR);
    const symbol = getCurrencySymbol();
    
    // For cryptocurrencies, show more decimal places
    if (currency === 'BTC' || currency === 'ETH') {
      return `${symbol}${converted.toFixed(8)}`;
    }
    
    // For regular currencies, show 2 decimal places
    return `${symbol}${converted.toFixed(2)}`;
  };

  return {
    currency,
    setCurrency: changeCurrency,
    getCurrencySymbol,
    getCurrencyName,
    convertPrice,
    formatPrice,
    currencies: CURRENCIES,
  };
};

