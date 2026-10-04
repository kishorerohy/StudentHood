export function formatNumber(value, locale=navigator.language){
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(value, options={}, locale=navigator.language){
  return new Intl.DateTimeFormat(locale,{dateStyle:'medium',...options}).format(new Date(value));
}

export function formatTime(value, options={}, locale=navigator.language){
  return new Intl.DateTimeFormat(locale,{timeStyle:'short',...options}).format(new Date(value));
}

export function formatMoney(amount, currency, locale=navigator.language){
  if(!currency) throw new Error('A currency code is required for money formatting.');
  return new Intl.NumberFormat(locale,{
    style:'currency',
    currency:String(currency).toUpperCase(),
    currencyDisplay:'symbol'
  }).format(amount);
}

export function formatRelative(value, unit='minute', locale=navigator.language){
  return new Intl.RelativeTimeFormat(locale,{numeric:'auto'}).format(value,unit);
}

/*
  StudentHood stores monetary values with an ISO 4217 currency code per record.
  We format the stored currency for the user's locale instead of converting money
  or guessing a currency from location. Currency conversion, if introduced later,
  must use a dated exchange-rate source and clearly label the converted estimate.
*/