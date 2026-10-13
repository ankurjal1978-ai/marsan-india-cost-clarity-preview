export const CURRENCIES = ['USD', 'INR', 'GBP', 'EUR'];
export const BOT_MARSAN_RATE = 10;
export const AUG_MARSAN_RATE = 8;

const number = (value, max) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const text = (value, max = 200) => typeof value === 'string' && value.length <= max;

export function validBotAnswers(a) {
  return !!a && typeof a === 'object' && CURRENCIES.includes(a.currency)
    && Number.isInteger(a.headcount) && a.headcount >= 1 && a.headcount <= 10000
    && number(a.monthlyBot, 1e9) && number(a.monthlyAug, 1e9) && a.monthlyBot + a.monthlyAug > 0
    && number(a.currentBotRate, 100) && number(a.currentAugRate, 100)
    && (a.transitionCost === null || number(a.transitionCost, 1e9))
    && ['0-3 months', '3-6 months', '6-12 months', '12+ months', 'Unsure'].includes(a.contractWindow)
    && Array.isArray(a.priorities) && a.priorities.length <= 3
    && a.priorities.every(v => ['Cost transparency', 'Talent ownership', 'Transfer readiness', 'Service quality', 'Governance', 'Speed to scale'].includes(v))
    && text(a.currentProvider, 100);
}

export function calculateBot(a) {
  const botUnderlying = a.monthlyBot / (1 + a.currentBotRate / 100);
  const augUnderlying = a.monthlyAug / (1 + a.currentAugRate / 100);
  const marsanMonthlyBot = botUnderlying * (1 + BOT_MARSAN_RATE / 100);
  const marsanMonthlyAug = augUnderlying * (1 + AUG_MARSAN_RATE / 100);
  const currentAnnual = (a.monthlyBot + a.monthlyAug) * 12;
  const modeledAnnual = (marsanMonthlyBot + marsanMonthlyAug) * 12;
  const annualDifference = currentAnnual - modeledAnnual;
  return {
    currentAnnual: Math.round(currentAnnual),
    modeledAnnual: Math.round(modeledAnnual),
    annualDifference: Math.round(annualDifference),
    botDifference: Math.round((a.monthlyBot - marsanMonthlyBot) * 12),
    augDifference: Math.round((a.monthlyAug - marsanMonthlyAug) * 12),
    firstYearDifference: a.transitionCost === null ? null : Math.round(annualDifference - a.transitionCost),
    basis: 'Scenario based on the fee rates entered, assuming equal underlying talent cost and service scope. It is not a quote or a claim about any provider.',
    modelVersion: 'marsan-bot-comparison-1',
  };
}

export function validOpsAnswers(a) {
  if (!a || typeof a !== 'object' || !CURRENCIES.includes(a.currency)) return false;
  if (!Number.isInteger(a.headcount) || a.headcount < 1 || a.headcount > 10000) return false;
  if (!Number.isInteger(a.vendorCount) || a.vendorCount < 2 || a.vendorCount > 100) return false;
  const fees = a.monthlyFees;
  if (!fees || typeof fees !== 'object') return false;
  const keys = ['payroll', 'compliance', 'eor', 'facilities', 'other'];
  if (!keys.every(k => number(fees[k], 1e9)) || keys.reduce((n, k) => n + fees[k], 0) <= 0) return false;
  return (a.weeklyCoordinationHours === null || number(a.weeklyCoordinationHours, 168))
    && (a.loadedHourlyCost === null || number(a.loadedHourlyCost, 10000))
    && (a.proposedMonthlyFee === null || number(a.proposedMonthlyFee, 1e9))
    && (a.transitionCost === null || number(a.transitionCost, 1e9))
    && ['0-3 months', '3-6 months', '6-12 months', '12+ months', 'Unsure'].includes(a.contractWindow)
    && Array.isArray(a.priorities) && a.priorities.length <= 3
    && a.priorities.every(v => ['Fewer invoices', 'Cost visibility', 'Compliance confidence', 'Clear ownership', 'Leadership time', 'Employee experience'].includes(v));
}

export function calculateOps(a) {
  const monthlyFees = ['payroll', 'compliance', 'eor', 'facilities', 'other'].reduce((n, k) => n + a.monthlyFees[k], 0);
  const annualFees = monthlyFees * 12;
  const capacityValue = a.weeklyCoordinationHours === null || a.loadedHourlyCost === null
    ? null : a.weeklyCoordinationHours * a.loadedHourlyCost * 52;
  const cashDifference = a.proposedMonthlyFee === null ? null : annualFees - a.proposedMonthlyFee * 12;
  return {
    annualServiceFees: Math.round(annualFees),
    annualInvoicesApprox: a.vendorCount * 12,
    annualCoordinationValue: capacityValue === null ? null : Math.round(capacityValue),
    cashBreakEvenMonthlyFee: Math.round(monthlyFees),
    economicBreakEvenMonthlyFee: Math.round(monthlyFees + (capacityValue || 0) / 12),
    annualCashDifference: cashDifference === null ? null : Math.round(cashDifference),
    firstYearCashDifference: cashDifference === null || a.transitionCost === null ? null : Math.round(cashDifference - a.transitionCost),
    basis: 'Service fees exclude salaries and pass-through costs. Coordination time is shown separately as capacity value, not guaranteed cash savings. A MarSan proposal is required to verify savings.',
    modelVersion: 'marsan-ops-visibility-1',
  };
}

const blockedDomains = ['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'hotmail.com', 'outlook.com', 'outlook.in', 'live.com', 'icloud.com', 'proton.me', 'protonmail.com', 'mail.com', 'gmx.com', 'rediffmail.com', 'yandex.com', 'mailinator.com', 'yopmail.com', 'tempmail.com', '10minutemail.com'];
export function validWorkEmail(input) {
  if (typeof input !== 'string' || input.length > 254) return null;
  const email = input.trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\.[a-z]{2,63}$/.test(email)) return null;
  const domain = email.split('@')[1];
  return blockedDomains.some(d => domain === d || domain.endsWith('.' + d)) ? null : email;
}
