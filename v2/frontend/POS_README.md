# POS System

## Product Entry (3 methods)

1. **📷 AI Camera** - Auto-detects product at 90% confidence
2. **📱 Barcode** - Direct SKU scan (Chrome/Edge)
3. **🔍 Search** - Manual name/SKU lookup

## Services

- `MlModelService` - Loads models from `/assets/ml-models/{channelId}/`
- `CameraService` - Device camera management
- `BarcodeScannerService` - BarcodeDetector API
- `ProductSearchService` - GraphQL queries

## ML Models

```
backend/static/assets/ml-models/{channelId}/latest/
├── model.json       # TF.js architecture
├── weights.bin      # Weights
└── metadata.json    # Product IDs (labels)
```

## Future: Cashier Role

Two-step flow: Salesperson creates order → Cashier validates payment

**States:** `DRAFT` → `PENDING_PAYMENT` → `PAID`

See [ROADMAP.md](../ROADMAP.md)
