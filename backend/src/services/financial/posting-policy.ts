/**
 * Posting Policy
 * 
 * Maps business domain events to accounting journal entry templates.
 * This abstracts accounting terminology from business logic.
 */

export interface JournalEntryTemplate {
  lines: Array<{
    accountCode: string;
    debit?: number;
    credit?: number;
    meta?: Record<string, any>;
  }>;
  memo?: string;
}

export interface PaymentPostingContext {
  amount: number; // in cents
  method: string; // payment method code
  orderId: string;
  orderCode: string;
  customerId?: string;
}

export interface SalePostingContext {
  amount: number; // in cents
  orderId: string;
  orderCode: string;
  customerId: string;
  isCreditSale: boolean;
}

export interface PurchasePostingContext {
  amount: number; // in cents
  purchaseId: string;
  purchaseReference: string;
  supplierId: string;
  isCreditPurchase: boolean;
}

export interface SupplierPaymentPostingContext {
  amount: number; // in cents
  purchaseId: string;
  purchaseReference: string;
  supplierId: string;
  method: string; // payment method code
}

export interface RefundPostingContext {
  amount: number; // in cents
  orderId: string;
  orderCode: string;
  originalPaymentId: string;
  method: string; // original payment method
}

/**
 * Maps payment method codes to clearing account codes
 */
function mapPaymentMethodToAccount(methodCode: string): string {
  switch (methodCode) {
    case 'cash-payment':
      return 'CASH_ON_HAND';
    case 'mpesa-payment':
      return 'CLEARING_MPESA';
    case 'credit-payment':
      return 'CLEARING_CREDIT';
    default:
      return 'CLEARING_GENERIC';
  }
}

/**
 * Generate journal entry template for customer payment settlement
 * 
 * Debits: Cash/Clearing account (asset increase)
 * Credits: Sales account (income increase)
 */
export function createPaymentEntry(context: PaymentPostingContext): JournalEntryTemplate {
  const clearingAccount = mapPaymentMethodToAccount(context.method);
  
  return {
    lines: [
      {
        accountCode: clearingAccount,
        debit: context.amount,
        meta: {
          orderId: context.orderId,
          orderCode: context.orderCode,
          method: context.method,
          customerId: context.customerId,
        },
      },
      {
        accountCode: 'SALES',
        credit: context.amount,
        meta: {
          orderId: context.orderId,
          orderCode: context.orderCode,
          method: context.method,
        },
      },
    ],
    memo: `Payment received for order ${context.orderCode}`,
  };
}

/**
 * Generate journal entry template for credit sale (order fulfilled without payment)
 * 
 * Debits: Accounts Receivable (asset increase - customer owes us)
 * Credits: Sales account (income increase)
 */
export function createCreditSaleEntry(context: SalePostingContext): JournalEntryTemplate {
  if (!context.isCreditSale) {
    throw new Error('createCreditSaleEntry called for non-credit sale');
  }

  return {
    lines: [
      {
        accountCode: 'ACCOUNTS_RECEIVABLE',
        debit: context.amount,
        meta: {
          orderId: context.orderId,
          orderCode: context.orderCode,
          customerId: context.customerId,
        },
      },
      {
        accountCode: 'SALES',
        credit: context.amount,
        meta: {
          orderId: context.orderId,
          orderCode: context.orderCode,
          customerId: context.customerId,
        },
      },
    ],
    memo: `Credit sale for order ${context.orderCode}`,
  };
}

/**
 * Generate journal entry template for customer payment allocation (paying off credit)
 * 
 * Debits: Clearing account (asset increase - cash received)
 * Credits: Accounts Receivable (asset decrease - customer debt reduced)
 */
export function createPaymentAllocationEntry(context: PaymentPostingContext): JournalEntryTemplate {
  const clearingAccount = mapPaymentMethodToAccount(context.method);
  
  return {
    lines: [
      {
        accountCode: clearingAccount,
        debit: context.amount,
        meta: {
          orderId: context.orderId,
          orderCode: context.orderCode,
          method: context.method,
          customerId: context.customerId,
        },
      },
      {
        accountCode: 'ACCOUNTS_RECEIVABLE',
        credit: context.amount,
        meta: {
          orderId: context.orderId,
          orderCode: context.orderCode,
          customerId: context.customerId,
        },
      },
    ],
    memo: `Payment allocation for order ${context.orderCode}`,
  };
}

/**
 * Generate journal entry template for supplier credit purchase
 * 
 * Debits: Purchases account (expense increase)
 * Credits: Accounts Payable (liability increase - we owe supplier)
 */
export function createSupplierPurchaseEntry(context: PurchasePostingContext): JournalEntryTemplate {
  if (!context.isCreditPurchase) {
    throw new Error('createSupplierPurchaseEntry called for non-credit purchase');
  }

  return {
    lines: [
      {
        accountCode: 'PURCHASES',
        debit: context.amount,
        meta: {
          purchaseId: context.purchaseId,
          purchaseReference: context.purchaseReference,
          supplierId: context.supplierId,
        },
      },
      {
        accountCode: 'ACCOUNTS_PAYABLE',
        credit: context.amount,
        meta: {
          purchaseId: context.purchaseId,
          purchaseReference: context.purchaseReference,
          supplierId: context.supplierId,
        },
      },
    ],
    memo: `Credit purchase ${context.purchaseReference}`,
  };
}

/**
 * Generate journal entry template for supplier payment
 * 
 * Debits: Accounts Payable (liability decrease - debt paid)
 * Credits: Cash account (asset decrease - cash paid out)
 */
export function createSupplierPaymentEntry(context: SupplierPaymentPostingContext): JournalEntryTemplate {
  const cashAccount = mapPaymentMethodToAccount(context.method);
  
  return {
    lines: [
      {
        accountCode: 'ACCOUNTS_PAYABLE',
        debit: context.amount,
        meta: {
          purchaseId: context.purchaseId,
          purchaseReference: context.purchaseReference,
          supplierId: context.supplierId,
        },
      },
      {
        accountCode: cashAccount,
        credit: context.amount,
        meta: {
          purchaseId: context.purchaseId,
          purchaseReference: context.purchaseReference,
          supplierId: context.supplierId,
          method: context.method,
        },
      },
    ],
    memo: `Payment to supplier for purchase ${context.purchaseReference}`,
  };
}

/**
 * Generate journal entry template for refund
 * 
 * Reverses the original payment entry
 * Debits: Sales Returns (income decrease)
 * Credits: Cash/Clearing account (asset decrease - money returned)
 */
export function createRefundEntry(context: RefundPostingContext): JournalEntryTemplate {
  const clearingAccount = mapPaymentMethodToAccount(context.method);
  
  return {
    lines: [
      {
        accountCode: 'SALES_RETURNS',
        debit: context.amount,
        meta: {
          orderId: context.orderId,
          orderCode: context.orderCode,
          originalPaymentId: context.originalPaymentId,
        },
      },
      {
        accountCode: clearingAccount,
        credit: context.amount,
        meta: {
          orderId: context.orderId,
          orderCode: context.orderCode,
          originalPaymentId: context.originalPaymentId,
          method: context.method,
        },
      },
    ],
    memo: `Refund for order ${context.orderCode}`,
  };
}

