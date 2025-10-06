# ML Model Management - Brief Guide

## Storage & Structure

**Location:** `static/assets/ml-models/{channelId}/v{version}/`

Each channel gets:

- `model.json` - TensorFlow.js model architecture (~50 KB)
- `weights.bin` - Model weights (2-5 MB)
- `metadata.json` - Labels, image size, version (~1 KB)

**URLs:** Served via AssetServerPlugin at `/assets/ml-models/{channelId}/v{version}/{model.json,weights.bin,metadata.json}`

## Channel Custom Fields

Add to `vendure-config.ts`:

```typescript
customFields: {
  Channel: [
    { name: 'modelBaseUrl', type: 'string', nullable: true, public: true },
    { name: 'modelVersion', type: 'string', nullable: true, public: true },
    { name: 'modelLastTrained', type: 'datetime', nullable: true, public: true },
    { name: 'modelTrainingStatus', type: 'string', nullable: true, public: true },
    { name: 'modelAutoRetrainEnabled', type: 'boolean', defaultValue: true },
  ],
}
```

With the baseurl, the frontend can construct the full urls for the model files.
Models only recognise the productID, which is immutable, allowig us to retain the same model across renames, price changes, etc.

## Training Triggers (Configurable)

**Event-based:**

- Product added/deleted → Queue training
- Product image changed → Queue training
- Debounced by 1 minute to prevent rapid re-trains

**Scheduled fallback:**

- Daily cron job at 2 AM
- Only trains if inventory changed since last training

**Disable triggers** by setting `modelAutoRetrainEnabled` to false or removing items from `modelRetrainTriggers`.

## Plugin Structure

```
src/plugins/ai-model-management/
├── ai-model-management.plugin.ts          # Main plugin
├── services/
│   └── model-training.service.ts          # Training pipeline
├── listeners/
│   └── inventory-change.listener.ts       # Event listeners (debounced)
└── jobs/
    └── scheduled-model-update.job.ts      # Daily cron job
```

**Key flow:**

1. Event fires (product/image change)
2. Listener debounces (waits 1 min)
3. Queue training job
4. Service collects product images
5. Train model (Teachable Machine format)
6. Save to `static/assets/ml-models/{channelId}/v{version}/`
7. Update channel custom fields with new URLs

## Frontend Sync

**On login:**

```typescript
// Query channel model info via GraphQL
// Check IndexedDB cache version
// If outdated: download & cache model files
// Load model into TensorFlow.js
```

**Offline detection:**

- Model cached in IndexedDB (~15 MB)
- Products cached by Apollo (~3 MB for 1000 products)
- Offline sales queued (limit: 100 sales)
- **Total storage:** ~20-30 MB

**Apollo handles product caching automatically** - we just configure persistence.

## Update Process

**Manual:** Trigger via Admin UI button
Easy initially when we have few customers, but this is required before launch.

**Automatic:**(future enhancement, crucial for scalability)

1. Product inventory changes
2. Training queued (debounced)
3. Model trained overnight or after debounce period
4. Version incremented (semver patch)
5. New files saved alongside old version (versioned storage)
6. Channel fields updated with new URLs
7. Frontend checks version on next sync
8. Downloads if version mismatch

## Implementation Checklist

- [ ] Add custom fields + run migration
- [ ] Create plugin directory structure
- [ ] Install `@tensorflow/tfjs-node`
- [ ] Implement ModelTrainingService (start with Teachable Machine API)
- [ ] Add event listeners with debouncing
- [ ] Add daily cron job
- [ ] Create frontend ModelSyncService
- [ ] Test end-to-end flow
- [ ] Add Admin UI controls

## Training Options

1. **Teachable Machine API** - Easiest, use their hosted service
2. **TensorFlow.js Node** - Train MobileNet locally, full control
3. **Python microservice** - Call external service for heavy training

Start with #1, migrate to #2 later if needed.

---

**Reference v1:**

- Models table: `company` relation, 3 file fields (model, metadata, weights)
- Frontend: Downloads on sell page load, caches in memory, uses Teachable Machine lib
- No auto-updates - manual model upload only

**v2 Improvements:**

- Auto-training on inventory changes
- Version management
- Persistent IndexedDB cache
- Configurable triggers
- Scheduled fallback updates
