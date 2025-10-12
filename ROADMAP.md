# Roadmap

All future plans consolidated.

---

## Phase 1: Core POS (Q1 2026)

### Product Management

- [ ] Bulk import (CSV/Excel)
- [ ] Product duplication
- [ ] Variant combinations (Color × Size for apparel)
- [ ] SKU-specific photos toggle
- [ ] Product templates (quick setup for common types)

### POS Enhancements

- [ ] Cashier role (two-step: sell → pay)
- [ ] Pro-forma invoice printing
- [ ] Multiple payment methods per sale
- [ ] Receipt customization
- [ ] Offline queue sync

### Inventory

- [ ] Stock adjustments
- [ ] Stock transfers between locations
- [ ] Low stock alerts
- [ ] Reorder points
- [ ] Batch/expiry tracking

---

## Phase 2: Analytics (Q2 2026)

### Reports

- [ ] Sales trends (daily/weekly/monthly)
- [ ] Top products
- [ ] Revenue by location
- [ ] Profit margins
- [ ] Inventory valuation

### Dashboard

- [ ] Side-by-side shop comparison
- [ ] Visual charts
- [ ] Export to Excel
- [ ] Scheduled email reports

---

## Phase 3: Mobile PWA (Q3 2026)

### Features

- [ ] Install prompt
- [ ] Offline mode with service worker
- [ ] Push notifications (low stock, new orders)
- [ ] Biometric login (fingerprint)
- [ ] Pull-to-refresh
- [ ] Swipe actions on cards
- [ ] Haptic feedback

### Optimization

- [ ] Skeleton loading states
- [ ] Virtual scrolling (large lists)
- [ ] Image lazy loading
- [ ] Prefetch next pagination page

---

## Phase 4: ML & Automation (Q4 2026)

### AI Features

- [ ] Auto-training triggers (product changes)
- [ ] SKU-level detection (variant-specific photos)
- [ ] Performance tracking & auto-retrain
- [ ] Voice commands for POS
- [ ] Smart product categorization
- [ ] Price suggestions based on cost

### Model Improvements

- [ ] Versioned model storage (rollback capability)
- [ ] A/B testing model versions
- [ ] Training history queries
- [ ] Python microservice (for GPU acceleration)

---

## Future Considerations

### UX Enhancements

- [ ] Voice search
- [ ] Gesture navigation (swipe between pages)
- [ ] Multi-language support (Swahili, English)
- [ ] Custom theme colors per business
- [ ] Dark mode toggle
- [ ] Product preview (bottom sheet)
- [ ] Quick filters (chips)
- [ ] Batch actions (multi-select)

### Business Features

- [ ] Customer loyalty program
- [ ] Promotions/discounts
- [ ] Tax categories
- [ ] Product collections
- [ ] Facets (custom attributes)
- [ ] Price history tracking
- [ ] Cost tracking (profit calculation)

### Enterprise

- [ ] Multi-currency support
- [ ] Advanced user permissions
- [ ] Audit logs
- [ ] API webhooks
- [ ] Custom integrations
- [ ] White-label options

---

## Completed ✅

See [CHANGELOG.md](./CHANGELOG.md)

---

## Decisions Log

### 2025-10-11: Variant Management KISS

**Decision:** One option = one variant (no automatic combinations)  
**Reasoning:** 80% use case, zero learning curve, can add complexity later  
**Trade-off:** T-shirt sellers need workarounds until Phase 1 combinations

### 2025-10-11: Product-Level Photos

**Decision:** Photos at product level, barcodes at SKU level  
**Reasoning:** Informal sector has identical packaging, pricing posters  
**Future:** Add `useSkuSpecificPhotos` toggle in Phase 4

### 2025-10-11: ML Model Storage

**Decision:** Static files (no database), public URLs, IndexedDB cache  
**Reasoning:** No DB overhead, offline support, models are not sensitive  
**Security:** Only product IDs in model, prices/inventory at API level

---

**Last Updated:** October 2025  
**Next Review:** After MVP launch
