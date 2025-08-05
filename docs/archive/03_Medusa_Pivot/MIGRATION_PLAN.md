Dukahub — Platform Decision & Road-Map Document
A full narrative (history → pain points → pivot).

0. Executive Snapshot
Original target: Build Dukahub on Frappe + ERPNext to outsource accounting & inventory.

Reality: Install hurdles, hardware heaviness, and ERP-grade complexity burned dev-days.

Pivot: Adopt MedusaJS v2 (MIT-licensed headless commerce) which ships the same commerce primitives with a 5-minute Docker up and an MIT licence.

Outcome: Focus shifts back to our differentiator—camera-first POS & AI training loop—while keeping multi-store, ledger, and tax logic out-of-the-box.

1. Timeline of Key Decisions
Date	Decision Point	Rationale
2025-06	Chose Frappe/ERPNext (“Machine is free”)	Wanted full ledgers Day 1; GPL SaaS model acceptable.
2025-07	First install attempt (bare-metal Ubuntu 22)	Hit MariaDB root issues & blank UI pages.
2025-07→08	Two more install passes (Bench & Docker)	Same errors; min spec guidance suggested 4-8 GB RAM.
2025-08-04	Exploration of Directus, Strapi, Budibase, Vendure, Medusa	Needed a JS stack plus built-in commerce.
2025-08-05	Final pivot to Medusa v2	Met every must-have with lowest friction.

2. Original Frappe Plan (Why it looked perfect)
Goal	How Frappe/ERPNext Promised to Deliver
Accounts & Ledgers	GL, double entry, invoices ready Day 1.
Inventory	Item masters, stock ledger, UOM conversions built-in.
ACL / Users	Role & Permission manager in core.
Reporting	Query/Script reports, dashboards, print formats auto-generated.
Licence Match	GPL v3 aligned with open-core SaaS model.

Optimization thesis: “Spend 0 % of effort on the Machine, 100 % on the AI ‘Magic’.”

3. Pain-Points that Broke the Deal
Category	Concrete Evidence	Resulting Cost
Install fragility	Repeated MariaDB root login failures, yarn build errors, blank Desk after bench setup production (identical community issues) 
Frappe Forum
GitHub
Frappe Forum
≈ 3 dev-days lost; no stable sandbox.
Hardware footprint	Community & dev-ops guides recommend 4 GB RAM / 40 GB disk min, 8 GB for stable prod 
Reddit
Frappe Forum
Frappe Forum
VPS cost ↑; sluggish local VMs.
Learning curve	Must master DocTypes meta-model + Desk + Bench + Role trees + Server Scripts.	Context switching; slower feature delivery.
ERP over-reach	HR, Payroll, Manufacturing modules load unless trimmed; DB & UI clutter.	Extra maintenance; cashier UX noise.
GPL lock-step	On-prem clients receive full source; fine for SaaS but limits future licensing pivots.	Reduced commercial flexibility.

4. Pivot Criteria (Must-Haves)
JS/TS Stack — fastest productivity.

Commerce Primitives — orders, stock, payments already modelled.

< 1 hr to first sale — fast iteration.

Permissive licence — retain on-prem upsell if desired.

Multi-tenant — white-label for many shops.

Active community — docs, Discord, plugins, POS recipes.

5. Candidates Assessed
Stack	Pros	Killer Gap
Budibase / Directus / Supabase	5-min CRUD back-ends	No accounting ledgers.
Vendure v3	GraphQL-typed commerce, Channel system	GPL/commercial licence; no POS starter.
MedusaJS v2	REST+GraphQL, MIT, POS recipe, Stores module	Admin widgets are React (optional).

6. Comparative Snapshot – Frappe vs. Medusa vs. Vendure
Axis	Frappe + ERPNext	MedusaJS v2	Vendure v3
Install → first sale	Multi-hour; fragile	~5 min Docker 
docs.medusajs.com
GitHub
10-15 min
Licence	MIT (Frappe) + GPL v3 (ERPNext)	MIT	GPL v3 / paid
POS starter	None (Desk ≠ POS)	medusa-pos-react PWA 
GitHub
None
Multi-tenant	Multisite (heavy)	Stores module 
docs.medusajs.com
Channels
Hardware	4–8 GB RAM rec. 
Reddit
Runs on 512 MB dev box	Similar to Medusa
API style	REST (JSON RPC)	REST and GraphQL	GraphQL only
Learning ramp	ERP meta-model, Jinja Desk	Plain TS services	NestJS + GraphQL

7. Chosen Path – MedusaJS v2
Unique Strengths
MIT licence → unrestricted SaaS & on-prem.

POS recipe & PWA repo → one-click scaffold of cashier UI.

Stores module → native multi-tenant.

Event bus & modular services → override any piece without forking.

High-Level Boot Plan
Phase	Deliverable	Est. Duration
0. Infra Spin-up	docker compose up (Postgres, Redis, Medusa, Admin)	0.5 day
1. POS Fork	medusa-pos-react cloned, Scan button stubbed	1 day
2. Camera Service	/recognize Go micro-service returns {sku, qty}	1 day
3. Store Isolation	Enable Stores, add header x-medusa-store-id	0.5 day
4. Demo Sale	End-to-end walk-through, receipt print	1 day
5. Offline PWA	Queue cart writes (IndexedDB) → replay	2 days

8. Road-Map Pivot Areas
Milestone	Old (Frappe)	New (Medusa)	Notes
AI Training Loop	Python Server Script in Frappe	Stand-alone Go service hitting Medusa webhooks	Decoupled = easier to scale.
Offline Sync	Frappe’s PWA only in ERPNext v15 beta	Medusa POS PWA + IndexedDB	Already community-tested.
Reporting	ERPNext Report Builder	Use Medusa Admin widgets or external BI (Metabase)	REST export is simpler.
Multi-tenant SaaS	Frappe Multisite (per-tenant DB)	Medusa Stores (row-level isolation)	Lighter ops; single DB cluster.
Licence Strategy	GPL community + Hosted SaaS	Pure MIT; option for closed-source enterprise plugins later	More commercial freedom.

9. Migration Checklist (Frappe → Medusa)
Data model mapping

ERPNext Item → Medusa Product

Sales Invoice → Order

Stock Ledger → Inventory Service CSV import

Feature salvage

Re-use existing product photos & barcodes.

Port discount logic via Medusa Pricing Module override.

Team skill shift

Drop Python ERP workflows; double-down on TypeScript micro-services.

10. Risks & Mitigations
Risk	Mitigation
Medusa community skewed to e-commerce, not POS	We fork existing POS PWA; maintain in-house.
Stores module still evolving	Contribute to upstream issues; keep fallback of per-DB store if needed.
Offline sync edge-cases	Implement integration tests with flaky network simulator.

