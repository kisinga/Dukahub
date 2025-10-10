# POS System - Quick Reference

## What's Implemented

### Core Features
- ✅ **ML-powered product detection** via camera (TensorFlow.js + Teachable Machine)
- ✅ **Barcode scanning** using BarcodeDetector API
- ✅ **Manual product search** by name/SKU
- ✅ **Shopping cart** with quantity management
- ✅ **Mobile-first design** with auto-start scanner on mobile devices

### Services Created
1. `MlModelService` - Loads and runs AI models
2. `CameraService` - Manages device camera access
3. `BarcodeScannerService` - Handles barcode detection
4. `ProductSearchService` - GraphQL product queries

## Usage

### Basic Flow
1. Navigate to `/dashboard/sell`
2. On mobile: Camera auto-starts
3. Point camera at product → Auto-detects when confidence > 90%
4. Or search manually by typing product name
5. Or scan barcode (if browser supports it)
6. Confirm product → Add to cart
7. Checkout

### Configuration
Edit in `sell.component.ts`:
```typescript
confidenceThreshold: 0.9,  // 90% confidence required
detectionIntervalMs: 1200,  // Check every 1.2 seconds
```

## ML Model Setup

Place models at: `/backend/static/assets/ml-models/{channelId}/latest/`
- `model.json` - TensorFlow.js model
- `weights.bin` - Model weights
- `metadata.json` - Labels & config

See `ML_MODEL_GUIDE.md` for full details.

## Browser Support

| Feature | Support |
|---------|---------|
| Camera Access | All modern browsers |
| ML Detection | All modern browsers |
| Barcode Scanner | Chrome/Edge/Samsung Internet |

Barcode scanner gracefully degrades to manual search on unsupported browsers.

## Mobile Optimization
- Camera auto-starts on mobile devices
- Touch-optimized controls (min 44px targets)
- Responsive grid layout
- Bottom-fixed cart on small screens

That's it! 🎯

