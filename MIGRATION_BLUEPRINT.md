# Dukahub v2 Architecture: The Single Source of Truth

## 1. Executive Summary & Core Problem

This document is the definitive architectural blueprint for Dukahub v2. All previous documentation is superseded by this plan.

**The core problem Dukahub solves is the profound inefficiency small retail businesses face in recording sales and managing inventory.** Our primary objective is to provide an incredibly fast and intuitive Point of Sale (POS) system, augmented with AI, that makes this process effortless.

To achieve this, we are migrating from the v1 PocketBase monolith to a modern, headless architecture powered by **Vendure**. This establishes a scalable foundation for future growth while enhancing our core POS functionality.

## 2. Architectural Vision & Technology Selection

### 2.1. Guiding Principles

- **API-First:** The backend is a headless service, decoupled from any specific frontend.
- **Modular & Extensible:** Custom business logic will be encapsulated in plugins, never modifying core framework code.
- **Scalable:** The architecture must support a growing number of tenants and transactions.
- **Developer Velocity:** Leverage modern, type-safe technologies (TypeScript) to build robust features quickly.

### 2.2. The Case for Vendure

Vendure was strategically chosen over other platforms like MedusaJS for its strong alignment with our core architectural needs:

- **GraphQL-First API:** Ideal for the complex state management of our Angular SPA, allowing efficient data fetching.
- **First-Class Multi-Tenancy:** Vendure's built-in `Channel` concept provides a robust, native solution for the multi-company tenancy that is central to Dukahub's business model.
- **Structured Framework (NestJS):** Provides a highly organized, maintainable, and scalable foundation.

## 3. Target Architecture

The v2 architecture consists of four primary, containerized services.

```mermaid
graph TD
    subgraph Browser/Device
        A[Angular POS SPA]
    end
    subgraph Cloud Infrastructure
        B[Vendure Server <br/> (Node.js/NestJS)]
        C[Vendure Worker <br/> (Background Jobs)]
        D[PostgreSQL Database]
        E[AI Service <br/> (Model Training)]
    end

    A -- GraphQL API --> B
    B -- Jobs --> C
    B -- TCP --> D
    C -- TCP --> D
    E -- Stores Models --> B
```

### 3.1. Frontend: Angular POS SPA

The frontend is a Single-Page Application responsible for the entire user experience.

- **Framework:** Angular with Tailwind CSS.
- **Core Feature:** A highly responsive POS interface with offline capabilities (via Service Workers and IndexedDB) to ensure sales can be recorded even with intermittent connectivity.
- **AI Integration:** Performs **on-device** product recognition using TensorFlow.js models downloaded from the backend.

### 3.2. Backend: Vendure Core

Vendure forms the entire backend, handling all core commerce logic.

- **Vendure Server:** The main API server handling GraphQL requests, authentication, and business logic.
- **Vendure Worker:** A separate process for handling asynchronous tasks like running AI training jobs, sending emails, and re-indexing search.
- **Database:** PostgreSQL for its reliability and robust transaction support.

### 3.3. AI/ML Service & Architecture

The AI service is a critical component for delivering the "magic" of Dukahub's POS. The architecture is optimized for performance and offline capability.

1.  **Training (Server-Side):** When a tenant uploads new product images, a job is queued for the Vendure Worker. The worker process uses these images to train or retrain the tenant's specific TensorFlow model.
2.  **Distribution (Server-Side):** The newly trained model files (`model.json`, `weights.bin`) are stored and associated with the tenant's `Channel`.
3.  **Inference (Client-Side):** When a user logs into the POS, the Angular application downloads the latest version of their company's model and caches it locally in IndexedDB. All real-time product recognition from the camera feed happens **directly on the device**. This provides instantaneous recognition and full functionality even when offline.

This on-device approach is viable for the vast majority of our target audience (<1000 products) and avoids network latency during the critical sales process.

## 4. Domain & Data Model

This section maps the business concepts of Dukahub to the target architecture in Vendure.

### 4.1. Multi-Tenancy & User Management

This is the most critical architectural concept.

- **System-Level Admin:** A global "Super Admin" dashboard exists for Dukahub administrators to manage the entire platform. This is the original admin interface and remains unchanged.
- **Tenant-Level Administration (`Channel`):** Each Dukahub customer (a company) is provisioned as a **`Channel`** in Vendure. This is the core of our multi-tenancy model, providing complete data isolation.
- **Tenant Dashboards:** Each `Channel` will have its own dedicated administrative interface, accessible only to its users. This is where a company owner manages their own products, views their own sales reports, and, crucially, **manages their own staff's user accounts (`Administrator` records) and permissions** within their channel.

### 4.2. Core Business Logic Mapping

| **Dukahub Business Concept** | **Vendure Implementation**                              | **Notes & Business Flow**                                                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Companies / Branches         | `Channel` / `StockLocation`                             | **UX Context:** Each Dukahub customer company is a `Channel`. Their shops are `StockLocations`. Login auto-selects first company; user then selects shop (primary navbar action). POS/stats are shop-specific. Company selector is in extended menu (rare use). |
| Products / SKUs              | `Product` / `ProductVariant`                            | A direct mapping. Vendure's system handles products with multiple variations (e.g., size, color) elegantly.                                                                                                                                                     |
| Purchasing & Suppliers       | Custom `PurchaseOrder` Plugin / `Channel` for Suppliers | A custom plugin will be built to manage purchase orders. To enable advanced future features, major suppliers can be modeled as distinct `Channels`, allowing for supplier-specific product catalogs.                                                            |
| **Sales (POS Transaction)**  | **`Order` State Machine**                               | This is the heart of the system. The POS frontend creates a `Draft` order. Adding items populates it. Payment transitions the order to `PaymentSettled`, at which point inventory is deducted. This entire flow is managed by Vendure's robust state machine.   |
| Inventory Management         | `StockLevel` / `StockMovement`                          | All inventory changes (sale, purchase, return, spoilage) are recorded as `StockMovements`, providing a full audit trail for every single item in every `StockLocation`. Reorder points will trigger notifications.                                              |
| Customers (Debtors)          | `Customer`                                              | Maps directly to Vendure's `Customer` entity. Customer-specific pricing and order history are available out of the box.                                                                                                                                         |
| Invoices & Financials        | Custom `Financials` Plugin                              | While the `Order` contains all necessary data for an invoice, a dedicated custom plugin will handle the generation of printable invoice documents, manage financial accounts (Chart of Accounts), and produce financial reports (P&L, Balance Sheet).           |

## 5. Authentication and Authorization

Leveraging Vendure's built-in capabilities, the authentication and authorization model is designed for security and tenant isolation.

- **User Login:** All users, whether they are cashiers, managers, or company owners, will log in through the Angular SPA. The SPA communicates with the Vendure Shop API's standard login endpoints.
- **Role-Based Access Control (RBAC):** Within each tenant's (`Channel`) dashboard, the company owner (or a designated administrator) can create roles with specific permissions (e.g., "Cashier," "Inventory Manager," "Admin").
- **Tenant-Scoped Permissions:** Permissions are strictly confined to the `Channel` a user belongs to. A "Cashier" in Company A has no access or visibility into Company B's data.
- **Session Management:** Secure, token-based session management is handled by Vendure out-of-the-box.

## 6. Migration Strategy

The transition from v1 (PocketBase) to v2 (Vendure) will be executed in carefully managed phases to minimize disruption and risk.

### Phase 1: Foundation & Scaffolding (Sprint 1-2)

- **Goal:** Establish the core infrastructure and application skeletons.
- **Tasks:**
  1.  Provision cloud infrastructure on Azure (Managed PostgreSQL, App Service, Storage).
  2.  Initialize the Vendure v2 project with a clean database schema.
  3.  Configure the first `Channel` for a pilot/test company.
  4.  Scaffold the custom plugins (`Financials`, `PurchaseOrder`, `AIModelManagement`).

### Phase 2: Data Migration (Sprint 3)

- **Goal:** Transfer all essential v1 data to the new v2 structure.
- **Tasks:**
  1.  Develop and rigorously test ETL (Extract, Transform, Load) scripts for migrating data from a PocketBase backup.
  2.  **Migration Order is Critical:**
      - `Users` & `Companies` -> `Administrators` & `Channels`
      - `ProductCategories` -> `Collections` / `Facets`
      - `Products` & `Skus` -> `Products` & `ProductVariants`
      - `Partners` (Customers) -> `Customers`
      - `Inventory` -> `StockLevels`
      - Historical `SalesTransactions` -> `Orders` (This will be the most complex script).
  3.  Perform a dry-run migration to a staging environment to validate data integrity.

### Phase 3: Feature Parity Development (Sprint 4-6)

- **Goal:** Implement the core business logic and UI to match and exceed v1's capabilities.
- **Tasks:**
  1.  Build the essential components of the Angular SPA, focusing first on the critical POS sales flow and inventory management.
  2.  Develop the custom `Financials` plugin to handle basic accounting.
  3.  Implement the server-side AI model training and management within the `AIModelManagement` plugin.
  4.  Build and test the tenant-specific dashboards for user and product management.

### Phase 4: Pilot, Testing & Go-Live (Sprint 7-8)

- **Goal:** Validate the system with real users and prepare for production launch.
- **Tasks:**
  1.  Onboard a pilot company onto the staging environment.
  2.  Conduct comprehensive User Acceptance Testing (UAT), focusing on the POS offline and AI recognition features.
  3.  Perform load testing on the staging environment.
  4.  Execute the final production data migration, deploy the application, and go live.

## 7. Risks and Mitigation

| Risk Category | Specific Risk                                                                     | Mitigation Strategy                                                                                                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Technical** | **Data Migration Integrity:** Data loss or corruption during the ETL process.     | Extensive validation scripts, a full dry-run on a staging environment, and a complete backup of the v1 database before the final production migration.                                                                                    |
| **Technical** | **Offline POS Complexity:** Bugs in the service worker or IndexedDB sync logic.   | Rigorous, automated testing of the offline mode under various network conditions (flaky, completely offline). A manual sync trigger will be provided as a fallback.                                                                       |
| **Business**  | **Feature Parity Gap:** The new v2 system is missing a critical workflow from v1. | The phased development approach prioritizes core workflows first. Continuous feedback from the pilot user during the UAT phase will be crucial to identify and address any gaps before the full launch.                                   |
| **Business**  | **User Adoption:** Existing users may find the new interface confusing.           | The new Angular SPA will be designed with a strong focus on UX, aiming to be even more intuitive than the v1 interface. Short, targeted training videos will be produced for key workflows like completing a sale and managing inventory. |

## 8. Deployment Strategy

The target deployment architecture is a containerized setup hosted on a public cloud provider like Azure.

- **Containerization:** All services (Vendure Server, Worker, Angular SPA, AI Service, PostgreSQL) will be packaged as Docker containers. `docker-compose.yml` will be used for local development.
- **CI/CD:** GitHub Actions will be configured to automatically build and push new container images to a private container registry (e.g., GitHub Packages, Azure Container Registry) on every push to the main branch.
- **Cloud Deployment:** The application will be deployed as a containerized web app (e.g., Azure App Service for Containers). A managed PostgreSQL service will be used for the database.
- **Persistent Storage:** A shared file storage solution (e.g., Azure Files) will be mounted into the Vendure containers to persist uploaded assets like product images and AI models.

This strategy ensures a reproducible, scalable, and automated deployment process.
