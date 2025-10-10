# POS System - Documentation

## Current Implementation

### Detection Methods (3 ways to add products)
1. **📷 AI Camera Detection** - Point camera at product, auto-detects at 90% confidence
2. **📱 Barcode Scanner** - Scan product barcode (Chrome/Edge only)
3. **🔍 Manual Search** - Type product name/SKU

### Architecture
```
MlModelService      → Loads AI models from /assets/ml-models/{channelId}/
CameraService       → Manages device camera (front/back)
BarcodeScannerService → BarcodeDetector API wrapper
ProductSearchService  → GraphQL product queries
```

### Component Structure
```
SellComponent
├── Scanner State (signals)
├── Cart State (signals)
├── Search State (signals)
└── Configuration (editable threshold)
```

## Usage

**Desktop:** Click "Scan" button to start camera  
**Mobile:** Camera auto-starts on page load

**Detection Settings:**
- Confidence threshold: 50-99% (default 90%)
- Detection interval: 1200ms
- Configurable via UI slider

## ML Model Placement

```
/backend/static/assets/ml-models/
└── {channelId}/
    └── latest/
        ├── model.json       (TF.js architecture)
        ├── weights.bin      (Model weights)
        └── metadata.json    (Product IDs as labels)
```

Product IDs in `metadata.labels[]` must match Vendure product IDs.

## Future: Cashier Role (Payment Validation)

### Two-Step Sales Process
Separates selling from payment collection - critical for specialist sales environments.

**Flow:**
1. **Salesperson** adds items to cart (phone specialist, computer specialist, etc.)
2. Salesperson clicks **"Submit to Cashier"**
3. Order enters `PENDING_PAYMENT` state
4. **Pro-forma invoice** prints (not a receipt yet - unpaid)
5. Customer takes invoice to **Cashier station**
6. **Cashier** validates payment (cash/card/mobile money/etc.)
7. Cashier records payment method
8. Order marked as `PAID`
9. Physical document stamped **"PAID"**

**Why This Matters:**
- **Specialization:** Product experts sell, cashiers handle money
- **Central reconciliation:** One cashier for multiple salespeople
- **Audit trail:** Clear separation of duties
- **Real-world example:** Computer + phone shop with specialist staff → both customers pay to same cashier

**Implementation:**
- Order state: `DRAFT` → `PENDING_PAYMENT` → `PAID`
- Salesperson role: Can create orders, cannot mark as paid
- Cashier role: Can view pending orders, validate payments, mark as paid
- UI: "Submit to Cashier" button for salespeople
- UI: "Pending Payments" queue for cashiers
- Print: Pro-forma invoice (unpaid) vs. Receipt (paid)

## Browser Compatibility

| Feature | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| Camera | ✅ | ✅ | ✅ |
| ML Detection | ✅ | ✅ | ✅ |
| Barcode API | ✅ | ❌ | ❌ |

Graceful degradation: Barcode falls back to manual search.

