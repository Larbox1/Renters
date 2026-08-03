// Loan math. The stored inputs are what the user typed (principal, annual
// rate, dates); every figure below is derived on the fly and never persisted,
// so displayed numbers always agree with the inputs.
//
// Standard French/US amortization: constant monthly payment
//   M = P·r / (1 − (1+r)⁻ⁿ)   (M = P/n when the rate is zero)
// and remaining principal after k payments
//   B(k) = P·(1+r)ᵏ − M·((1+r)ᵏ − 1)/r

export type LoanInputs = {
  principalCents: number;
  /** Annual nominal rate in basis points (3.52 % → 352). */
  annualRateBps: number;
  /** ISO dates (yyyy-mm-dd). */
  startDate: string;
  endDate: string;
};

export type LoanFigures = {
  termMonths: number;
  /** Payments already made, clamped to [0, termMonths]. */
  elapsedMonths: number;
  monthlyPaymentCents: number;
  remainingCents: number;
  repaidCents: number;
  totalInterestCents: number;
  totalCostCents: number;
  /** Share of the principal repaid so far, 0..1. */
  progress: number;
};

export function monthsBetween(start: Date, end: Date): number {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
}

export function loanFigures(
  inputs: LoanInputs,
  today: Date = new Date(),
): LoanFigures | null {
  const start = new Date(inputs.startDate);
  const end = new Date(inputs.endDate);
  const n = monthsBetween(start, end);
  const P = inputs.principalCents;
  if (!Number.isFinite(n) || n <= 0 || !(P > 0)) return null;

  const r = inputs.annualRateBps / 10_000 / 12;
  const M = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));

  const k = Math.min(Math.max(monthsBetween(start, today), 0), n);
  const remaining =
    r === 0
      ? P - M * k
      : P * Math.pow(1 + r, k) - (M * (Math.pow(1 + r, k) - 1)) / r;

  const totalInterest = Math.max(0, M * n - P);
  const repaid = Math.min(P, Math.max(0, P - remaining));

  return {
    termMonths: n,
    elapsedMonths: k,
    monthlyPaymentCents: Math.round(M),
    remainingCents: Math.max(0, Math.round(remaining)),
    repaidCents: Math.round(repaid),
    totalInterestCents: Math.round(totalInterest),
    totalCostCents: Math.round(P + totalInterest),
    progress: Math.min(1, Math.max(0, repaid / P)),
  };
}

export type AmortizationPoint = {
  /** Months since the loan start; 0 = before any payment. */
  monthIndex: number;
  balanceCents: number;
  cumulativeInterestCents: number;
};

/**
 * Month-by-month schedule, iterated exactly as a bank would: each payment
 * splits into interest (balance × r) and principal. Point 0 is the full
 * principal at the start date; the last point lands on zero.
 */
export function amortizationPoints(
  inputs: LoanInputs,
): AmortizationPoint[] | null {
  const f = loanFigures(inputs);
  if (!f) return null;

  const r = inputs.annualRateBps / 10_000 / 12;
  const M =
    r === 0
      ? inputs.principalCents / f.termMonths
      : (inputs.principalCents * r) / (1 - Math.pow(1 + r, -f.termMonths));

  const points: AmortizationPoint[] = [
    { monthIndex: 0, balanceCents: inputs.principalCents, cumulativeInterestCents: 0 },
  ];
  let balance = inputs.principalCents;
  let interest = 0;
  for (let m = 1; m <= f.termMonths; m++) {
    const interestPart = balance * r;
    interest += interestPart;
    balance = Math.max(0, balance - (M - interestPart));
    points.push({
      monthIndex: m,
      balanceCents: Math.round(balance),
      cumulativeInterestCents: Math.round(interest),
    });
  }
  return points;
}

/** "352" bps → "3.52" for display; trims trailing zeros ("300" → "3"). */
export function rateBpsToPercent(bps: number): string {
  return String(bps / 100);
}

/** "3.52" percent input → 352 bps; null when not a valid non-negative rate. */
export function percentToRateBps(raw: string): number | null {
  const n = parseFloat(raw.replace(",", "."));
  if (isNaN(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100);
}
