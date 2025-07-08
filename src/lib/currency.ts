// Currency utilities for plan pricing and Stripe integration

export interface CurrencyInfo {
  code: string;
  symbol: string;
  multiplier: number; // Conversion from USD base prices
}

export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', multiplier: 1 },
  GBP: { code: 'GBP', symbol: '£', multiplier: 0.79 } // Approximate conversion rate
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

/**
 * Detect user's currency based on their location
 * Returns GBP for UK users, USD for everyone else
 */
export const detectUserCurrency = async (): Promise<CurrencyCode> => {
  try {
    // Try to get user's location via geolocation
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    // Return GBP for UK users
    if (data.country_code === 'GB') {
      return 'GBP';
    }
    
    return 'USD';
  } catch (error) {
    console.warn('Failed to detect user location, defaulting to USD:', error);
    return 'USD';
  }
};

/**
 * Get user's currency synchronously (with fallback)
 * This can be used when async detection isn't available
 */
export const getUserCurrencySync = (): CurrencyCode => {
  // Check if user timezone suggests UK
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timeZone.includes('London') || timeZone.includes('Europe')) {
    // Additional check for UK-specific timezones
    const ukTimezones = ['Europe/London', 'Europe/Belfast', 'Europe/Dublin'];
    if (ukTimezones.some(tz => timeZone.includes(tz))) {
      return 'GBP';
    }
  }
  
  return 'USD';
};

/**
 * Convert price from USD cents to target currency
 */
export const convertPrice = (usdCents: number, targetCurrency: CurrencyCode): number => {
  const currency = CURRENCIES[targetCurrency];
  return Math.round(usdCents * currency.multiplier);
};

/**
 * Format price for display
 */
export const formatPrice = (cents: number, currency: CurrencyCode): string => {
  const currencyInfo = CURRENCIES[currency];
  const amount = cents / 100;
  
  return `${currencyInfo.symbol}${amount.toFixed(2)}`;
};

/**
 * Get price data for Stripe checkout
 */
export const getPriceForCheckout = (usdCents: number, currency: CurrencyCode) => {
  return {
    amount: convertPrice(usdCents, currency),
    currency: currency.toLowerCase()
  };
};