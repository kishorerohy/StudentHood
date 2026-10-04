export function formatMoney(amount, currency, locale) {
  if (!currency) throw new Error('currency is required');
  return new Intl.NumberFormat(locale || undefined, {
    style: 'currency',
    currency: String(currency).toUpperCase(),
    currencyDisplay: 'symbol'
  }).format(amount);
}

export function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: 'medium'
  }).format(new Date(value));
}

export function formatTime(value, locale) {
  return new Intl.DateTimeFormat(locale || undefined, {
    timeStyle: 'short'
  }).format(new Date(value));
}

/*
  Currency rule:
  - Every paid Gig/listing must store its original ISO 4217 currency code.
  - The UI formats that currency for the device locale.
  - Never silently convert or infer a currency from location.
  - Any future conversion must show the source currency, converted estimate,
    rate timestamp and rate source.
*/
