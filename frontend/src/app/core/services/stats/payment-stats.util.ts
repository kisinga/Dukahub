/**
 * Payment Stats Utility
 *
 * Pure functions for calculating payment statistics from payment data.
 */

export interface PaymentStats {
  totalPayments: number;
  settledPayments: number;
  authorizedPayments: number;
  declinedPayments: number;
  todayPayments: number;
}

export interface Payment {
  id: string;
  state: string;
  amount?: number;
  createdAt: string;
}

/**
 * Calculate payment stats from an array of payments
 * Pure function - no side effects
 *
 * @param payments - Array of payments (typically last X items from page or filtered data)
 * @returns PaymentStats object with calculated metrics
 */
export function calculatePaymentStats(payments: Payment[]): PaymentStats {
  const totalPayments = payments.length;
  const settledPayments = payments.filter((p) => p.state === 'Settled').length;
  const authorizedPayments = payments.filter((p) => p.state === 'Authorized').length;
  const declinedPayments = payments.filter(
    (p) => p.state === 'Declined' || p.state === 'Cancelled',
  ).length;

  // Today's payments
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPayments = payments.filter((p) => {
    if (!p.createdAt) return false;
    const paymentDate = new Date(p.createdAt);
    paymentDate.setHours(0, 0, 0, 0);
    return paymentDate.getTime() === today.getTime();
  }).length;

  return { totalPayments, settledPayments, authorizedPayments, declinedPayments, todayPayments };
}
