## Dukahub Feature Catalog (Customer-Facing)

This catalog gives a **business-focused overview of what Dukahub can do** for your shop, back office, and finance team.
It is written for:

- **Merchant owners & managers** – evaluating or running Dukahub
- **Operations / back-office staff** – configuring daily workflows
- **Product / marketing teams** – understanding capabilities and language

Each feature is tagged with its **origin**:

- **Vendure Core** – Standard capability from the Vendure commerce framework
- **Dukahub-Enhanced** – Vendure feature extended or hardened by Dukahub
- **Dukahub-Exclusive** – Net-new capability built specifically for Dukahub

For details and setup steps, follow the links to the **focused guides**.

---

## Guide Map

- [Authentication & Access Control](./auth-and-access.md)
- [Catalog, Products & AI Recognition](./inventory-and-stock.md#catalog-and-products)
- [Inventory & Stock Locations](./inventory-and-stock.md)
- [Orders, Checkout & Payments](./orders-and-billing.md)
- [Customers, Suppliers & Onboarding](./customers-and-onboarding.md)
- [Subscriptions & Account Status](./orders-and-billing.md#subscriptions--account-status)
- [Integrations & Automation](./integrations-and-automation.md)
- [Analytics, Credit & Ledger](./analytics-and-ledger.md)
- [Machine Learning & Smart Automation](./ml-and-intelligence.md)

---

## Authentication & Access Control

High-level feature set for **how people log in and what they can access**.

| Feature                                      | What it does                                                                                                                                                      | Who uses it                                   | Origin                                              | More details                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Admin login with phone or password           | Secure login to the Dukahub dashboard (admin side), using Vendure’s admin API and Dukahub’s frontend.                                                             | Owners, managers, staff with dashboard access | Dukahub-Enhanced (built on Vendure admin auth)      | [Auth & Access](./auth-and-access.md#admin-login-flows)                   |
| Role-based access control                    | Define roles (e.g. Owner, Manager, Cashier) and control which screens and operations each role can use. Scoped per business (channel).                            | Owners, back-office admins                    | Vendure Core + Dukahub-Enhanced (extra permissions) | [Auth & Access](./auth-and-access.md#roles--permissions)                  |
| Channel-based scoping (multi-company)        | Each business runs in an isolated “channel”. Users only see data for the channels they are assigned to.                                                           | Multi-shop owners, group admins               | Vendure Core + Dukahub-Enhanced                     | [Auth & Access](./auth-and-access.md#channels--multi-tenancy)             |
| Two-tier approval (user + business)          | New sign-ups go through **user-level approval** (account) and **channel-level approval** (business). Pending businesses operate in read-only mode until approved. | Dukahub back-office, compliance               | Dukahub-Exclusive                                   | [Auth & Access](./auth-and-access.md#two-tier-approval-flow)              |
| Subscription-aware access (trial, read-only) | Trial, active, expired, and cancelled subscription states control whether a business has full or read-only functionality.                                         | Dukahub back-office, billing                  | Dukahub-Exclusive                                   | [Orders & Billing](./orders-and-billing.md#subscriptions--account-status) |

---

## Catalog, Products & AI Recognition

How you define what you sell and how the POS finds it quickly.

| Feature                            | What it does                                                                                                                | Who uses it                                  | Origin                                             | More details                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| Product catalog with multiple SKUs | One product with multiple price/size options (e.g. 1kg, 2kg, 5kg).                                                          | Owners, inventory managers                   | Vendure Core (products/variants) used as-is        | [Inventory & Stock](./inventory-and-stock.md#catalog-and-products)    |
| Barcode-based product lookup       | Scan barcodes to add packaged goods to the cart or create products from an existing barcode.                                | Cashiers, stock controllers                  | Dukahub-Enhanced (on Vendure products)             | [Inventory & Stock](./inventory-and-stock.md#barcode-products)        |
| Label-photo AI recognition         | Use your phone camera to recognize **price labels/cards** for fresh produce and services, and add the correct item to cart. | Cashiers in markets, salons, informal retail | Dukahub-Exclusive                                  | [ML & Intelligence](./ml-and-intelligence.md#label-photo-recognition) |
| Service products without stock     | Sell services (e.g. haircuts) with infinite availability, while still tracking revenue.                                     | Salons, barbers, service businesses          | Vendure Core (trackInventory flag) surfaced in POS | [Inventory & Stock](./inventory-and-stock.md#services)                |
| Offline-ready catalog cache        | Pre-loads the active business’s catalog into the browser so sales stay snappy and resilient to spotty internet.             | All POS users                                | Dukahub-Exclusive                                  | [ML & Intelligence](./ml-and-intelligence.md#offline-first-pos)       |

---

## Inventory & Stock Locations

How Dukahub tracks **where your stock lives and how much you have**.

| Feature                              | What it does                                                                                             | Who uses it                 | Origin                      | More details                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------- | -------------------------------------------------------------------------- |
| Stock locations per business         | Define physical shops or warehouses for each business (channel). Inventory is tracked at location level. | Owners, operations          | Vendure Core                | [Inventory & Stock](./inventory-and-stock.md#stock-locations)              |
| POS-focused stock tracking           | Simple, location-based stock counts optimized for small retailers (no complex fulfilment).               | Cashiers, stock controllers | Dukahub-Enhanced            | [Inventory & Stock](./inventory-and-stock.md#stock-and-adjustments)        |
| Stock adjustments (future extension) | Planned conversion workflows (e.g. 100kg bulk → 1kg/2kg packs) with clear audit trail.                   | Owners, operations          | Dukahub-Exclusive (planned) | [Inventory & Stock](./inventory-and-stock.md#stock-conversion-future)      |
| Cashier-flow toggles per location    | Enable/disable a **two-step cashier flow** per location (salesperson vs cashier station).                | Owners, store managers      | Dukahub-Exclusive           | [Orders & Billing](./orders-and-billing.md#cashier-flow-two-step-checkout) |

---

## Orders, Checkout & Payments

Everything around **selling, taking payment, and tracking order status**.

| Feature                              | What it does                                                                                                 | Who uses it           | Origin                                  | More details                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| POS-style order flow (no shipping)   | Streamlined order flow optimized for in-store sales: draft → payment → completed, no shipping configuration. | Cashiers              | Dukahub-Enhanced (custom order process) | [Orders & Billing](./orders-and-billing.md#pos-order-flow)                 |
| Walk-in customer support             | Reuse a single “Walk-in customer” for anonymous sales while still keeping accounting clean.                  | Cashiers, owners      | Dukahub-Enhanced                        | [Customers & Onboarding](./customers-and-onboarding.md#walk-in-customers)  |
| Multi-tender payments (cash, M‑Pesa) | Take payments via cash and M‑Pesa (with Dukahub’s payment handlers and ledger postings).                     | Cashiers, finance     | Dukahub-Exclusive                       | [Orders & Billing](./orders-and-billing.md#payment-methods)                |
| Price overrides with permission      | Allow only trusted staff to override prices during checkout, with an audit trail.                            | Managers, supervisors | Dukahub-Exclusive                       | [Orders & Billing](./orders-and-billing.md#price-override-controls)        |
| Two-step cashier flow                | Salesperson sends order to a cashier station for payment, ideal for busy counters.                           | Sales staff, cashiers | Dukahub-Exclusive                       | [Orders & Billing](./orders-and-billing.md#cashier-flow-two-step-checkout) |

---

## Subscriptions & Account Status

How Dukahub handles **trials, subscriptions, and read-only mode**.

| Feature                           | What it does                                                                                             | Who uses it                        | Origin            | More details                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------- | -------------------------------------------------------------------- |
| 30-day free trial per business    | New businesses start on a full-feature trial, controlled by channel-level dates.                         | Dukahub back-office, new customers | Dukahub-Exclusive | [Orders & Billing](./orders-and-billing.md#trial-periods)            |
| Paystack subscription integration | Charge businesses via Paystack (including STK push), track subscription tier and renewals.               | Dukahub back-office, finance       | Dukahub-Exclusive | [Orders & Billing](./orders-and-billing.md#paystack-subscriptions)   |
| Read-only mode on expiry          | When a subscription expires, users can still log in and view data but **cannot create or edit** records. | All business users                 | Dukahub-Exclusive | [Orders & Billing](./orders-and-billing.md#read-only-mode-on-expiry) |

---

## Customers, Suppliers & Credit

Dukahub’s **unified people model** for customers, suppliers and credit accounts.

| Feature                              | What it does                                                                                              | Who uses it                      | Origin                                  | More details                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| Unified customers & suppliers        | Treat every supplier as a special kind of customer with extra fields (supplier type, terms, notes).       | Owners, purchasing, finance      | Dukahub-Exclusive (on Vendure Customer) | [Customers & Onboarding](./customers-and-onboarding.md#customers-and-suppliers)  |
| Mobile-first customer/supplier forms | Single-step customer and two-step supplier forms optimized for mobile keyboards and Kenyan phone formats. | Cashiers, admins                 | Dukahub-Exclusive                       | [Customers & Onboarding](./customers-and-onboarding.md#mobile-first-forms)       |
| Credit approvals & limits            | Mark customers as credit-approved, set limits, and let the POS enforce credit rules at checkout.          | Back-office credit team, finance | Dukahub-Exclusive                       | [Analytics & Ledger](./analytics-and-ledger.md#customer-credit-management)       |
| Outstanding balances per party       | Track how much each customer owes you and how much you owe each supplier, sourced from the ledger.        | Finance, owners                  | Dukahub-Exclusive (ledger integration)  | [Analytics & Ledger](./analytics-and-ledger.md#balances-and-outstanding-amounts) |

---

## Integrations & Automation

How Dukahub **connects with the outside world** and automates processes.

| Feature                                      | What it does                                                                                                        | Who uses it                  | Origin            | More details                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| GraphQL API (admin)                          | Full admin API for managing products, orders, customers, and more – the same API Dukahub’s dashboard uses.          | Internal tools, integrations | Vendure Core      | [Integrations & Automation](./integrations-and-automation.md#graphql-admin-api)         |
| Webhook-style ML training integration        | Generate manifests and accept ML models from external training services.                                            | ML team, integrators         | Dukahub-Exclusive | [ML & Intelligence](./ml-and-intelligence.md#ml-training-pipeline)                      |
| Paystack payments and webhooks               | Receive subscription and payment updates via Paystack webhooks and map them to channel state.                       | Dukahub back-office, finance | Dukahub-Exclusive | [Integrations & Automation](./integrations-and-automation.md#paystack-integration)      |
| Notification system (events → toasts & push) | Event-driven notifications for orders, stock, ML training, and payments; surfaced in-app and as push notifications. | All dashboard users          | Dukahub-Exclusive | [Integrations & Automation](./integrations-and-automation.md#notification-system)       |
| Observability hooks (traces, metrics)        | Instrumented traces and metrics via SigNoz/OpenTelemetry for troubleshooting and SLOs.                              | Dukahub engineering & ops    | Dukahub-Exclusive | [Integrations & Automation](./integrations-and-automation.md#observability--monitoring) |

---

## Analytics, Credit & Ledger

Financial features that turn Dukahub into a **lightweight accounting layer**.

| Feature                                  | What it does                                                                                             | Who uses it                      | Origin            | More details                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| Double-entry ledger per business         | Every sale, payment and purchase posts balanced entries into a channel-specific ledger.                  | Finance, accountants, auditors   | Dukahub-Exclusive | [Analytics & Ledger](./analytics-and-ledger.md#double-entry-ledger)                             |
| Channel-specific chart of accounts       | Each business gets its own chart of accounts (cash, MPesa, AR/AP, sales, purchases, etc.).               | Dukahub provisioning, finance    | Dukahub-Exclusive | [Customers & Onboarding](./customers-and-onboarding.md#channel-provisioning--chart-of-accounts) |
| Customer & supplier balances from ledger | Outstanding amounts for every customer and supplier are calculated from ledger entries (no ad-hoc math). | Finance, collections, purchasing | Dukahub-Exclusive | [Analytics & Ledger](./analytics-and-ledger.md#balances-and-outstanding-amounts)                |
| Credit limit enforcement at POS          | Checkout validates credit headroom before allowing “sell on credit” flows.                               | Cashiers, credit control         | Dukahub-Exclusive | [Analytics & Ledger](./analytics-and-ledger.md#customer-credit-management)                      |
| Basic performance dashboards             | Channel-level dashboards for sales and inventory KPIs (designed for small shops, not full BI).           | Owners, managers                 | Dukahub-Enhanced  | [Analytics & Ledger](./analytics-and-ledger.md#kpi-dashboards)                                  |

---

## Machine Learning & Smart Automation

AI-powered shortcuts that make Dukahub **feel magical but stay practical**.

| Feature                                          | What it does                                                                                                        | Who uses it                         | Origin            | More details                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------- | --------------------------------------------------------------------- |
| Label-photo product recognition at POS           | Point your camera at a handwritten price label or service card; Dukahub recognizes the product and adds it to cart. | Cashiers in markets, salons, kiosks | Dukahub-Exclusive | [ML & Intelligence](./ml-and-intelligence.md#label-photo-recognition) |
| Per-business ML models                           | Each business gets its own model trained on its own labels and catalog.                                             | Dukahub ML ops, larger retailers    | Dukahub-Exclusive | [ML & Intelligence](./ml-and-intelligence.md#per-channel-ml-models)   |
| Automated photo extraction & manifest generation | Automatically builds training datasets from product photos and outputs a manifest for external trainers.            | ML team, integrators                | Dukahub-Exclusive | [ML & Intelligence](./ml-and-intelligence.md#ml-training-pipeline)    |
| Offline model caching                            | Models are cached in the browser for fast, offline-ish inference.                                                   | Cashiers                            | Dukahub-Exclusive | [ML & Intelligence](./ml-and-intelligence.md#offline-first-pos)       |

---

## Operations & Reliability (Internal)

These features are mostly relevant for **ops and engineering**, but help explain reliability to customers.

| Feature                      | What it does                                                                                            | Who uses it               | Origin                             | More details                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| Containerized deployment     | Backend, frontend, database and observability run as separate containers, deployable on most platforms. | DevOps, IT                | Dukahub-Exclusive deployment layer | [Integrations & Automation](./integrations-and-automation.md#deployment--infrastructure) |
| First-run initialization     | One-shot database bootstrap and migration to prevent schema issues on new installs.                     | DevOps, IT                | Dukahub-Exclusive                  | [Integrations & Automation](./integrations-and-automation.md#first-run-initialization)   |
| Observability stack (SigNoz) | Centralized traces, logs and metrics for backend and frontend.                                          | Dukahub engineering & ops | Dukahub-Exclusive                  | [Integrations & Automation](./integrations-and-automation.md#observability--monitoring)  |

---

## How to Use This Catalog

- **Merchants & Managers** – Use this as a **capability map** when evaluating Dukahub or onboarding new staff.
- **Operations / Implementers** – Use the links to focused guides to configure each area step by step.
- **Product & Marketing** – Reuse the language here in pitch decks, landing pages and onboarding emails; it is aligned with the underlying implementation.

If you are unsure where a feature fits, start from the **focused guide that matches the business problem** (e.g. “We need to sell on credit” → [Analytics & Ledger](./analytics-and-ledger.md), “We want trial + subscription” → [Orders & Billing](./orders-and-billing.md)).
