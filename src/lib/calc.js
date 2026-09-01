// Loan calculation helpers (see SPEC section 4 & 8).

export function installmentCount(tenureDays, frequency) {
  const days = Number(tenureDays) || 0
  switch (frequency) {
    case 'daily': return days
    case 'weekly': return Math.ceil(days / 7)
    case 'monthly': return Math.ceil(days / 30)
    case 'yearly': return Math.ceil(days / 365)
    default: return 0
  }
}

export function computeLoan({ amountGiven, interestAmount, tenureDays, frequency }) {
  const amount = Number(amountGiven) || 0
  const interest = Number(interestAmount) || 0
  const total = amount + interest
  const count = installmentCount(tenureDays, frequency)
  const installment = count > 0 ? total / count : 0
  return {
    total_to_receive: total,
    installment_count: count,
    installment_amount: installment
  }
}

// When the user enters the total amount to be received directly (instead of
// interest): interest is derived, and the per-installment ("daily") amount too.
export function computeFromTotal({ amountGiven, totalToReceive, tenureDays, frequency }) {
  const given = Number(amountGiven) || 0
  const total = Number(totalToReceive) || 0
  const count = installmentCount(tenureDays, frequency)
  return {
    interest_amount: total - given,
    total_to_receive: total,
    installment_count: count,
    installment_amount: count > 0 ? total / count : 0
  }
}

const money = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
export function fmt(n) {
  return money.format(Number(n) || 0)
}
