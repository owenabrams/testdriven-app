/**
 * Currency Utility Functions
 * Centralized currency formatting for the entire application
 */

// Application Currency Settings
export const CURRENCY_SETTINGS = {
  code: 'UGX',
  symbol: 'UGX',
  name: 'Ugandan Shilling',
  locale: 'en-UG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
};

/**
 * Format amount as currency using application settings
 * @param {number} amount - The amount to format
 * @param {object} options - Optional formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, options = {}) => {
  const settings = { ...CURRENCY_SETTINGS, ...options };
  
  try {
    return new Intl.NumberFormat(settings.locale, {
      style: 'currency',
      currency: settings.code,
      minimumFractionDigits: settings.minimumFractionDigits,
      maximumFractionDigits: settings.maximumFractionDigits,
    }).format(amount || 0);
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    const formattedAmount = (amount || 0).toLocaleString();
    return `${settings.symbol} ${formattedAmount}`;
  }
};

/**
 * Format amount as currency without symbol (numbers only)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted number string
 */
export const formatAmount = (amount) => {
  try {
    return new Intl.NumberFormat(CURRENCY_SETTINGS.locale, {
      minimumFractionDigits: CURRENCY_SETTINGS.minimumFractionDigits,
      maximumFractionDigits: CURRENCY_SETTINGS.maximumFractionDigits,
    }).format(amount || 0);
  } catch (error) {
    return (amount || 0).toLocaleString();
  }
};

/**
 * Get currency symbol
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = () => CURRENCY_SETTINGS.symbol;

/**
 * Get currency code
 * @returns {string} Currency code
 */
export const getCurrencyCode = () => CURRENCY_SETTINGS.code;

/**
 * Get currency name
 * @returns {string} Currency name
 */
export const getCurrencyName = () => CURRENCY_SETTINGS.name;

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string to parse
 * @returns {number} Parsed number
 */
export const parseCurrency = (currencyString) => {
  if (typeof currencyString === 'number') return currencyString;
  if (!currencyString) return 0;
  
  // Remove currency symbols and spaces, then parse
  const cleanString = currencyString
    .toString()
    .replace(/[^\d.-]/g, '')
    .replace(/,/g, '');
    
  return parseFloat(cleanString) || 0;
};

/**
 * Validate if amount is a valid currency value
 * @param {any} amount - Amount to validate
 * @returns {boolean} True if valid currency amount
 */
export const isValidCurrencyAmount = (amount) => {
  const num = typeof amount === 'string' ? parseCurrency(amount) : amount;
  return typeof num === 'number' && !isNaN(num) && isFinite(num) && num >= 0;
};

/**
 * Currency input formatter for form inputs
 * @param {string} value - Input value
 * @returns {string} Formatted input value
 */
export const formatCurrencyInput = (value) => {
  if (!value) return '';
  
  // Remove non-numeric characters except decimal point
  const numericValue = value.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = numericValue.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  
  return numericValue;
};

// Export default currency formatter
export default formatCurrency;
