<!-- 27eed676-b8ab-4101-9549-3e44a68d5726 7a51536b-7e1e-4bda-a8b3-e137704f2e77 -->
## Composable FIFO Inventory & COGS Framework Plan

### 1. Define composable architecture boundaries

- **Layered design**: Explicitly separate (a) inventory state, (b) costing/valuation strategies, (c) expiry and movement policies, and (d) accounting/ledger posting policies, all channel-scoped.
- **Extension interfaces**: Define minimal TypeScript interfaces/abstractions for `InventoryStore`, `CostingStrategy`, `ExpiryPolicy`, and `PostingPolicy` so future features (e.g. FEFO, average cost, landed cost, multi-currency) can plug in without rewrites.
- **Configuration model**: Plan a per-channel configuration object (persisted or convention-based) that wires concrete implementations (e.g. FIFO costing, simple expiry policy) into these interfaces without leaking complexity to callers.

### 2. Design inventory state model as a stable core

- **Core entities**: Design `inventory_batch` and `inventory_movement` as the canonical source of stock state, with fields that are unlikely to change (channel, location, product/variant, qty, unitCost, expiryDate, sourceType/sourceId, metadata).
- **Abstraction over persistence**: Specify an `InventoryStore` interface (used by services and strategies) that hides direct DB access, so schema can evolve while keeping APIs stable.
- **Invariants and contracts**: Document invariants (no negative batch qty, movement immutability, sum of batches = on-hand stock) and expose read APIs explicitly designed for reuse (e.g. `getOpenBatches`, `getValuationSnapshot`) to support future analytics.

### 3. Introduce a pluggable costing strategy (FIFO-first)

- **CostingStrategy interface**: Define a generic interface like `allocateCost(request: CostAllocationRequest): CostAllocationResult` where the request is independent of FIFO and output is reusable by both inventory and ledger layers.
- **FIFO implementation**: Implement a first costing strategy as `FifoCostingStrategy` using `InventoryStore.getOpenBatchesForConsumption` with a clear, testable contract and deterministic output.
- **Future-proof hooks**: Design the interface so additional strategies (average cost, FEFO, batch-specific overrides) can be added later per channel or per product without changing callers.

### 4. Model expiry and movement policies as composable rules

- **ExpiryPolicy interface**: Define operations like `validateBeforeConsume`, `onBatchCreated`, and `onBatchExpired` so different channels can choose stricter or more relaxed expiry behavior.
- **Default implementation**: Provide a sensible default expiry policy (e.g. warn-but-allow past-expiry internal movements, block sales of expired batches) that integrates with FIFO/FEFO decisions without hard-coding rules inside services.
- **Movement types and rules**: Standardize movement types (purchase, sale, transfer, adjustment, write-off, expiry) and link them to policy hooks, making it easy to add new movement types (e.g. consignment, manufacturing) later.

### 5. Encapsulate ledger integration behind posting policies

- **PostingPolicy interface**: Define a narrow interface that accepts domain-level events + costing allocations and returns a set of journal line definitions (account codes, amounts, metadata) without DB concerns.
- **Inventory posting policies**: Implement baseline policies for purchases (Inventory vs AP/Cash), sales COGS (COGS vs Inventory), write-offs/expiry (Loss vs Inventory), and operating expenses (Expense vs AP/Cash), using only chart-of-accounts codes and channel context.
- **Ledger integration**: Keep `FinancialService` and `LedgerPostingService` as the only entry points into the ledger, simply delegating to the appropriate `PostingPolicy` and then calling `PostingService.post` for double-entry, idempotent writes.

### 6. Define high-level inventory & accounting facades

- **InventoryService facade**: Design a facade that exposes coarse-grained operations like `recordPurchase`, `recordSale`, `recordAdjustment`, `recordWriteOff`, and internally orchestrates `InventoryStore`, `CostingStrategy`, `ExpiryPolicy`, and `PostingPolicy`.
- **FinancialService extensions**: Extend or wrap `FinancialService` so expense recording and inventory-related postings go through a unified, composable path instead of ad-hoc ledger calls.
- **Stable contracts for callers**: Ensure order/purchase/stock services use simple, stable methods (e.g. `recordInventorySale({ orderId, lines, channelId, locationId })`) without knowledge of FIFO or ledger details.

### 7. Channel-scoped configuration and CoA extensions

- **Per-channel configuration registry**: Design a simple registry (DB or config-based) mapping channel → `CostingStrategy`, `ExpiryPolicy`, and `PostingPolicy` implementations, with a safe default (FIFO + default expiry + standard postings).
- **Chart of accounts evolution**: Extend `ChartOfAccountsService.initializeChannelAccounts` to create generic, reusable accounts (`INVENTORY`, `COGS`, `INVENTORY_WRITE_OFF`, `EXPIRY_LOSS`, `OPERATING_EXPENSE_*`), keeping codes stable and using metadata for finer categorization where needed.
- **Migration-friendly toggles**: Introduce feature flags or per-channel mode fields (e.g. `inventoryValuationMode: 'none' | 'shadow' | 'authoritative'`) to evolve channels gradually without forking code paths.

### 8. Data integrity, concurrency, and idempotency guarantees

- **Atomic flows**: Keep the invariant that domain changes, inventory movements, and ledger postings occur within a single DB transaction initiated by the orchestrating facade.
- **Concurrency model**: Use per-SKU/location locking (e.g. `SELECT ... FOR UPDATE` on a summary row) inside `InventoryStore` to prevent oversell and race conditions in batch selection while keeping the interface simple.
- **Idempotent orchestration**: Reuse the existing `(sourceType, sourceId)` idempotency pattern and ensure `CostingStrategy` + `InventoryStore` can reliably reconstruct or persist chosen allocations keyed by that source, so retries remain consistent.

### 9. Schema, migration, and backfill plan oriented around the framework

- **Schema migrations**: Design migrations that introduce the generic `inventory_batch` and `inventory_movement` tables plus any configuration tables, intentionally avoiding over-specialization to current flows.
- **Opening balances and shadow mode**: Define a backfill approach that creates initial batches and valuation snapshots, and a shadow mode where the framework computes inventory valuation and COGS side-by-side with current behavior for validation.
- **Reconciliation primitives**: Plan a small set of reusable queries/endpoints (e.g. `getInventoryValuationVsLedger`, `getMovementAuditTrail`) that rely only on the framework interfaces and entities, supporting future tooling and dashboards.

### 10. Phased framework rollout and documentation

- **Phase 1 – Framework skeleton**: Implement interfaces, baseline implementations (FIFO, default expiry, standard posting policies), and wiring in a feature-flagged, non-authoritative mode.
- **Phase 2 – Integrate key flows**: Gradually route purchases, sales, and stock adjustments for selected channels through the new `InventoryService` + posting policies, while running reconciliations and refining abstractions where they prove awkward.
- **Phase 3 – Stabilize and extend**: Promote the framework to the primary path, deprecate old ad-hoc flows, and update `LEDGER_ARCHITECTURE.md`, `INFRASTRUCTURE.md`, and developer docs to describe the composable model and extension points.

### To-dos

- [ ] Define high-level interfaces for InventoryStore, CostingStrategy, ExpiryPolicy, and PostingPolicy with clear responsibilities.
- [ ] Design inventory_batch and inventory_movement schema plus InventoryStore abstraction and invariants.
- [ ] Specify and implement FifoCostingStrategy using InventoryStore, with deterministic allocation outputs.
- [ ] Define ExpiryPolicy and standardized movement types and provide a default implementation.
- [ ] Design PostingPolicy interface and implement base policies for purchases, COGS, write-offs, and operating expenses.
- [ ] Design InventoryService facade and FinancialService extensions that orchestrate strategies and posting policies atomically.
- [ ] Design per-channel configuration registry and extend ChartOfAccountsService for inventory and COGS accounts.
- [ ] Define transaction boundaries, locking strategy in InventoryStore, and idempotency patterns for orchestrated flows.
- [ ] Plan DB migrations, initial backfill, and shadow-mode operation using the new framework entities.
- [ ] Plan feature flags, rollout phases, reconciliation tooling, and documentation updates for the new framework.