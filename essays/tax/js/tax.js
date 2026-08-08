/* Pure tax arithmetic: no DOM, no d3, testable in a console.
   2025-26 parameters for England, Wales and Northern Ireland (Scotland sets
   its own income tax bands). Sources: gov.uk income tax rates and personal
   allowances; gov.uk National Insurance rates and categories. Thresholds are
   frozen at these levels through 2027-28. */

export const PERSONAL_ALLOWANCE = 12_570;
export const TAPER_START = 100_000;          // PA shrinks £1 per £2 above this
export const BASIC_BAND = 37_700;            // taxable income taxed at 20%
export const HIGHER_LIMIT = 125_140;         // taxable income where 45% begins
export const NI_PRIMARY = 12_570;            // employee NI starts
export const NI_UPPER = 50_270;              // 8% up to here, 2% beyond

/* Income tax on gross annual employment income. */
export function incomeTax(gross) {
  let pa = PERSONAL_ALLOWANCE;
  if (gross > TAPER_START) {
    pa = Math.max(0, pa - (gross - TAPER_START) / 2);
  }
  const taxable = Math.max(0, gross - pa);
  const basic = Math.min(taxable, BASIC_BAND);
  const higher = Math.min(Math.max(taxable - BASIC_BAND, 0), HIGHER_LIMIT - BASIC_BAND);
  const additional = Math.max(taxable - HIGHER_LIMIT, 0);
  return basic * 0.20 + higher * 0.40 + additional * 0.45;
}

/* Employee Class 1 National Insurance (annualised). */
export function nationalInsurance(gross) {
  const main = Math.max(0, Math.min(gross, NI_UPPER) - NI_PRIMARY) * 0.08;
  const upper = Math.max(0, gross - NI_UPPER) * 0.02;
  return main + upper;
}

/* Split a bill across spending categories by share, in pence, using
   largest-remainder rounding so the pennies sum exactly to the bill.
   Shares are normalised by their own total (published shares can sum to
   100.1 through rounding). */
export function apportion(totalTax, categories) {
  const pence = Math.round(totalTax * 100);
  const totalShare = categories.reduce((a, c) => a + c.share, 0);
  const raw = categories.map(c => ({ ...c, exact: pence * c.share / totalShare }));
  const floored = raw.map(c => ({ ...c, p: Math.floor(c.exact) }));
  let left = pence - d3Sum(floored, c => c.p);
  const byRemainder = [...floored]
    .sort((a, b) => (b.exact - b.p) - (a.exact - a.p));
  for (let i = 0; left > 0; i = (i + 1) % byRemainder.length, left--) {
    byRemainder[i].p += 1;
  }
  return floored.map(c => ({ ...c, amount: c.p / 100 }));
}

function d3Sum(arr, f) { return arr.reduce((a, d) => a + f(d), 0); }
