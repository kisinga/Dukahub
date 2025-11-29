```
mutation CreateSubscriptionTiers {
  # Create Pro tier
  pro: createSubscriptionTier(input: {
    code: "pro"
    name: "Pro"
    description: "Essential Shop Operations. Everything you need to sell fast, track stock, and stay organized."
    priceMonthly: 150000
    priceYearly: 1440000
    features: {
      features: [
        "Sell with camera, barcode, or search"
        "Offline-first POS with auto-sync"
        "Real-time inventory tracking"
        "Customer credit tracking"
        "Basic Sales Reports"
        "Unlimited products"
      ]
    }
    isActive: true
  }) {
    id
    code
    name
    description
    priceMonthly
    priceYearly
    features
    isActive
    createdAt
  }

  # Create Business tier
  business: createSubscriptionTier(input: {
    code: "business"
    name: "Business"
    description: "Financial Control & Growth. For shops that need rigorous accounting, FIFO profit tracking, and deeper insights."
    priceMonthly: 250000
    priceYearly: 2400000
    features: {
      features: [
        "Everything in Pro"
        "True Profit Tracking (FIFO)"
        "Daily & Randomized Reconciliation"
        "Full Double-Entry Ledger"
        "Multi-store Management"
        "Advanced Financial Reports"
      ]
    }
    isActive: true
  }) {
    id
    code
    name
    description
    priceMonthly
    priceYearly
    features
    isActive
    createdAt
  }
}
```
